"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerPicker } from "@/shared/components/customer-picker";
import { cn, formatCurrency } from "@/lib/utils";
import { LineItemsEditor } from "@/features/quotations/components/line-items-editor";
import { PricingTermsFields } from "@/features/quotations/components/pricing-terms-fields";
import type { FinancialLineItemInput } from "@/lib/validations/quotation";

interface OrderOption {
  id: string;
  orderCode: string;
  totalValue: number;
  orderType: string;
}

const EMPTY_ITEM: FinancialLineItemInput = {
  type: "GARMENT",
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  tax: 0,
};

export function InvoiceCreateForm({ initialOrderId, currency }: { initialOrderId?: string; currency: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState<string | undefined>();
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderId, setOrderId] = useState<string | undefined>(initialOrderId);

  const [items, setItems] = useState<FinancialLineItemInput[]>([{ ...EMPTY_ITEM }]);
  const [dueDate, setDueDate] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [pricing, setPricing] = useState({
    discount: 0,
    tax: 0,
    deliveryFee: 0,
    additionalCharges: 0,
    paymentTerms: "",
    cancellationPolicy: "",
    refundPolicy: "",
    alterationPolicy: "",
    deliveryPolicy: "",
    customTerms: "",
  });

  useEffect(() => {
    if (initialOrderId) {
      fetch(`/api/orders/${initialOrderId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.order) {
            setCustomerId(d.order.customer.id);
            setOrders([{ id: d.order.id, orderCode: d.order.orderCode, totalValue: d.order.totalValue, orderType: d.order.orderType }]);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!customerId) {
      setOrders([]);
      return;
    }
    setLoadingOrders(true);
    fetch(`/api/orders?customerId=${customerId}&pageSize=50`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [customerId]);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal - pricing.discount + pricing.tax + pricing.deliveryFee + pricing.additionalCharges;

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          customerId,
          items,
          dueDate: dueDate || undefined,
          paymentInstructions,
          ...pricing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create invoice");
      toast.success(`Invoice ${data.invoice.invoiceNumber} created`);
      router.push(`/dashboard/invoices/${data.invoice.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!customerId && !!orderId && items.every((i) => i.name.trim().length > 0 && i.quantity > 0);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="space-y-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Customer & Order</p>
          <CustomerPicker
            customerId={customerId}
            onSelectCustomer={(c) => {
              setCustomerId(c?.id);
              setOrderId(undefined);
            }}
            onNewCustomerChange={() => {}}
          />
          {customerId && (
            <div className="space-y-2">
              <Label>Select Order</Label>
              {loadingOrders ? (
                <p className="text-sm text-muted-foreground">Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">This customer has no orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setOrderId(order.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                        orderId === order.id ? "border-primary bg-accent-soft" : "border-border bg-surface hover:border-primary/40"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{order.orderCode}</p>
                        <p className="text-xs text-muted-foreground">{order.orderType}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatCurrency(order.totalValue, currency)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Line Items</p>
          <LineItemsEditor items={items} onChange={setItems} currency={currency} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pricing & Terms</p>
          <PricingTermsFields value={pricing} onChange={(patch) => setPricing((prev) => ({ ...prev, ...patch }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Instructions</Label>
              <Textarea rows={2} value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} placeholder="e.g. Bank transfer details" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">{formatCurrency(total, currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting || !canSubmit}>
          {submitting ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </div>
  );
}
