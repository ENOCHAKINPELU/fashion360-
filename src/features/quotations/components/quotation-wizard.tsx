"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomerPicker } from "@/shared/components/customer-picker";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { LineItemsEditor, lineItemSubtotal } from "@/features/quotations/components/line-items-editor";
import { PricingTermsFields } from "@/features/quotations/components/pricing-terms-fields";
import type { FinancialLineItemInput } from "@/lib/validations/quotation";

const STEPS = ["Customer & Order", "Line Items", "Pricing & Terms", "Review & Send"] as const;

interface OrderOption {
  id: string;
  orderCode: string;
  totalValue: number;
  orderType: string;
  status: string;
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

export function QuotationWizard({ initialOrderId, currency }: { initialOrderId?: string; currency: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState<string | undefined>();
  const [customerName, setCustomerName] = useState("");
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderId, setOrderId] = useState<string | undefined>(initialOrderId);

  const [items, setItems] = useState<FinancialLineItemInput[]>([{ ...EMPTY_ITEM }]);
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
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [expiresAt, setExpiresAt] = useState("");
  const [sendImmediately, setSendImmediately] = useState(true);

  useEffect(() => {
    if (initialOrderId) {
      fetch(`/api/orders/${initialOrderId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.order) {
            setCustomerId(d.order.customer.id);
            setCustomerName(`${d.order.customer.firstName} ${d.order.customer.lastName}`);
            setOrders([{ id: d.order.id, orderCode: d.order.orderCode, totalValue: d.order.totalValue, orderType: d.order.orderType, status: d.order.status }]);
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
  const depositRequired = (total * depositPercentage) / 100;
  const balanceDue = total - depositRequired;

  const canProceedStep0 = !!customerId && !!orderId;
  const canProceedStep1 = items.every((i) => i.name.trim().length > 0 && i.quantity > 0);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          customerId,
          items,
          ...pricing,
          depositPercentage,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create quotation");

      if (sendImmediately) {
        const sendRes = await fetch(`/api/quotations/${data.quotation.id}/send`, { method: "POST" });
        if (!sendRes.ok) toast.error("Quotation created, but could not send it automatically");
      }

      toast.success(`Quotation ${data.quotation.quotationNumber} created`);
      router.push(`/dashboard/quotations/${data.quotation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create quotation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="hidden items-center sm:flex">
        {STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  index <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {index < step ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className={cn("text-xs font-medium whitespace-nowrap", index === step ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && <div className={cn("mx-3 h-px flex-1", index < step ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-foreground sm:hidden">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-5">
          {step === 0 && (
            <div className="space-y-5">
              <CustomerPicker
                customerId={customerId}
                onSelectCustomer={(c) => {
                  setCustomerId(c?.id);
                  setCustomerName(c ? `${c.firstName} ${c.lastName}` : "");
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
                    <p className="text-sm text-muted-foreground">{customerName} has no orders yet.</p>
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
            </div>
          )}

          {step === 1 && <LineItemsEditor items={items} onChange={setItems} currency={currency} />}

          {step === 2 && (
            <div className="space-y-5">
              <PricingTermsFields
                value={pricing}
                onChange={(patch) => setPricing((prev) => ({ ...prev, ...patch }))}
                showDeposit
                depositPercentage={depositPercentage}
                onDepositPercentageChange={setDepositPercentage}
              />
              <div className="space-y-1.5 sm:w-64">
                <Label>Quotation Expiry Date</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Summary</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="text-foreground">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order</span>
                    <span className="text-foreground">{orders.find((o) => o.id === orderId)?.orderCode ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span className="text-foreground">{items.length}</span>
                  </div>
                  {expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires</span>
                      <span className="text-foreground">{formatDate(expiresAt)}</span>
                    </div>
                  )}
                  <div className="mt-2 border-t border-border pt-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>{formatCurrency(lineItemSubtotal(item), currency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{formatCurrency(total, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit Required ({depositPercentage}%)</span>
                    <span className="text-foreground">{formatCurrency(depositRequired, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Balance</span>
                    <span className="text-foreground">{formatCurrency(balanceDue, currency)}</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <input type="checkbox" checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} />
                Send to customer for review immediately after creating
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !canProceedStep0) || (step === 1 && !canProceedStep1)}
          >
            Continue
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Quotation"}
          </Button>
        )}
      </div>
    </div>
  );
}
