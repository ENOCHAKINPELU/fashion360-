"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/shared/components/user-avatar";
import { formatDate } from "@/lib/utils";
import {
  orderPriorityOptions,
  deliveryMethodOptions,
  orderTypeOptions,
} from "@/lib/validations/order";
import type { OrderDetailData } from "@/features/orders/types";

interface StaffOption {
  id: string;
  name: string | null;
  image: string | null;
}

const ORDER_TYPE_LABELS = Object.fromEntries(orderTypeOptions.map((o) => [o.value, o.label]));
const DELIVERY_METHOD_LABELS = Object.fromEntries(deliveryMethodOptions.map((o) => [o.value, o.label]));

function money(value: number) {
  return `₦${value.toLocaleString()}`;
}

export function OrderOverviewTab({
  order,
  editOpen,
  onEditOpenChange,
}: {
  order: OrderDetailData;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const item = order.items[0];
  const measurements = order.measurementSnapshot;

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => buildFormState(order));

  useEffect(() => {
    if (!editOpen) return;
    setForm(buildFormState(order));
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setStaff(data.staff ?? []))
      .catch(() => setStaff([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen]);

  function buildFormState(o: OrderDetailData) {
    return {
      priority: o.priority,
      expectedCompletionDate: o.expectedCompletionDate ? o.expectedCompletionDate.slice(0, 10) : "",
      eventDate: o.eventDate ? o.eventDate.slice(0, 10) : "",
      occasion: o.occasion ?? "",
      deliveryMethod: o.deliveryMethod,
      deliveryAddress: o.deliveryAddress ?? "",
      customerNotes: o.customerNotes ?? "",
      designerNotes: o.designerNotes ?? "",
      privateNotes: o.privateNotes ?? "",
      assignedDesignerId: o.assignedDesigner?.id ?? "",
      fabricCost: String(o.fabricCost),
      customizationCost: String(o.customizationCost),
      additionalServicesCost: String(o.additionalServicesCost),
      deliveryFee: String(o.deliveryFee),
      discount: String(o.discount),
      tax: String(o.tax),
      depositRequired: String(o.depositRequired),
    };
  }

  function setField<K extends keyof ReturnType<typeof buildFormState>>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        priority: form.priority,
        occasion: form.occasion,
        deliveryMethod: form.deliveryMethod,
        deliveryAddress: form.deliveryAddress,
        customerNotes: form.customerNotes,
        designerNotes: form.designerNotes,
        privateNotes: form.privateNotes,
        assignedDesignerId: form.assignedDesignerId,
        pricing: {
          fabricCost: Number(form.fabricCost) || 0,
          customizationCost: Number(form.customizationCost) || 0,
          additionalServicesCost: Number(form.additionalServicesCost) || 0,
          deliveryFee: Number(form.deliveryFee) || 0,
          discount: Number(form.discount) || 0,
          tax: Number(form.tax) || 0,
          depositRequired: Number(form.depositRequired) || 0,
        },
      };
      if (form.expectedCompletionDate) body.expectedCompletionDate = form.expectedCompletionDate;
      if (form.eventDate) body.eventDate = form.eventDate;

      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update order");
      toast.success("Order updated");
      onEditOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update order");
    } finally {
      setSaving(false);
    }
  }

  const balanceDue = order.balanceDue;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {editOpen ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEditOpenChange(false)}>
            <X className="size-3.5" /> Cancel Edit
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEditOpenChange(true)}>
            <Pencil className="size-3.5" /> Edit Order
          </Button>
        )}
      </div>

      {editOpen && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Edit Order Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setField("priority", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderPriorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Designer</Label>
                <Select value={form.assignedDesignerId || "__none"} onValueChange={(v) => setField("assignedDesignerId", v === "__none" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name ?? "Unnamed"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Expected Completion Date</Label>
                <Input type="date" value={form.expectedCompletionDate} onChange={(e) => setField("expectedCompletionDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Event Date</Label>
                <Input type="date" value={form.eventDate} onChange={(e) => setField("eventDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Occasion</Label>
                <Input value={form.occasion} onChange={(e) => setField("occasion", e.target.value)} placeholder="e.g. Wedding" />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Method</Label>
                <Select value={form.deliveryMethod} onValueChange={(v) => setField("deliveryMethod", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryMethodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Delivery Address</Label>
                <Textarea rows={2} value={form.deliveryAddress} onChange={(e) => setField("deliveryAddress", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer Notes</Label>
                <Textarea rows={2} value={form.customerNotes} onChange={(e) => setField("customerNotes", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Designer Notes</Label>
                <Textarea rows={2} value={form.designerNotes} onChange={(e) => setField("designerNotes", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Private Notes</Label>
                <Textarea rows={2} value={form.privateNotes} onChange={(e) => setField("privateNotes", e.target.value)} />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Pricing</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Fabric Cost</Label>
                  <Input type="number" min="0" value={form.fabricCost} onChange={(e) => setField("fabricCost", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Customization Cost</Label>
                  <Input type="number" min="0" value={form.customizationCost} onChange={(e) => setField("customizationCost", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Additional Services</Label>
                  <Input type="number" min="0" value={form.additionalServicesCost} onChange={(e) => setField("additionalServicesCost", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Delivery Fee</Label>
                  <Input type="number" min="0" value={form.deliveryFee} onChange={(e) => setField("deliveryFee", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Discount</Label>
                  <Input type="number" min="0" value={form.discount} onChange={(e) => setField("discount", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax</Label>
                  <Input type="number" min="0" value={form.tax} onChange={(e) => setField("tax", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deposit Required</Label>
                  <Input type="number" min="0" value={form.depositRequired} onChange={(e) => setField("depositRequired", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => onEditOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Customer</p>
            <Link href={`/dashboard/customers/${order.customer.id}`} className="flex items-center gap-3 rounded-lg p-1.5 -m-1.5 hover:bg-muted">
              <UserAvatar name={`${order.customer.firstName} ${order.customer.lastName}`} image={order.customer.profilePhotoUrl} className="size-11" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{order.customer.customerCode}</p>
              </div>
            </Link>
            <div className="space-y-1 text-sm text-foreground">
              <p>{order.customer.phone ?? "No phone on file"}</p>
              <p>{order.customer.email ?? "No email on file"}</p>
            </div>
            {order.assignedDesigner && (
              <div className="border-t border-border pt-3">
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Assigned Designer</p>
                <div className="flex items-center gap-2">
                  <UserAvatar name={order.assignedDesigner.name} image={order.assignedDesigner.image} className="size-7" />
                  <span className="text-sm text-foreground">{order.assignedDesigner.name ?? "Unnamed"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Design & Customization</p>
            {item ? (
              <div className="flex gap-3">
                {item.designImageSnapshot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.designImageSnapshot} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    {item.designNameSnapshot ?? (item.isCustomDesign ? "Custom Design" : "N/A")}
                  </p>
                  {item.designCategorySnapshot && <p className="text-xs text-muted-foreground">{item.designCategorySnapshot}</p>}
                  {item.customDesignDescription && <p className="text-xs text-muted-foreground">{item.customDesignDescription}</p>}
                  <p className="text-xs text-muted-foreground">Qty {item.quantity} · {money(item.basePrice)} base</p>
                  {item.customization && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {item.customization.fabricNameSnapshot && <Detail label="Fabric" value={item.customization.fabricNameSnapshot} />}
                      {item.customization.primaryColor && <Detail label="Color" value={[item.customization.primaryColor, item.customization.secondaryColor].filter(Boolean).join(" / ")} />}
                      {item.customization.pattern && <Detail label="Pattern" value={item.customization.pattern} />}
                      {item.customization.sleeveStyle && <Detail label="Sleeve" value={item.customization.sleeveStyle} />}
                      {item.customization.neckline && <Detail label="Neckline" value={item.customization.neckline} />}
                      {item.customization.collarStyle && <Detail label="Collar" value={item.customization.collarStyle} />}
                      {item.customization.length && <Detail label="Length" value={item.customization.length} />}
                      {item.customization.buttonStyle && <Detail label="Buttons" value={item.customization.buttonStyle} />}
                      {item.customization.embroidery && <Detail label="Embroidery" value={item.customization.embroidery} />}
                      {item.customization.pocketStyle && <Detail label="Pockets" value={item.customization.pocketStyle} />}
                      {item.customization.cuffStyle && <Detail label="Cuffs" value={item.customization.cuffStyle} />}
                      {item.customization.lining && <Detail label="Lining" value={item.customization.lining} />}
                    </dl>
                  )}
                  {item.customization?.customInstructions && (
                    <p className="mt-1 text-xs text-foreground/80">{item.customization.customInstructions}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No design item on this order.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Measurements</p>
            {measurements && Object.keys(measurements).length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-3">
                {Object.entries(measurements).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</dt>
                    <dd className="text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No measurements recorded.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Order Details</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <Detail label="Order Type" value={ORDER_TYPE_LABELS[order.orderType] ?? order.orderType} />
              <Detail label="Order Date" value={formatDate(order.orderDate)} />
              <Detail label="Expected Completion" value={order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "N/A"} />
              <Detail label="Event Date" value={order.eventDate ? formatDate(order.eventDate) : "N/A"} />
              <Detail label="Occasion" value={order.occasion ?? "N/A"} />
              <Detail label="Delivery Method" value={DELIVERY_METHOD_LABELS[order.deliveryMethod] ?? order.deliveryMethod} />
              {order.deliveryAddress && <Detail label="Delivery Address" value={order.deliveryAddress} />}
            </dl>
            {(order.customerNotes || order.designerNotes || order.privateNotes) && (
              <div className="space-y-1.5 border-t border-border pt-2 text-xs">
                {order.customerNotes && <p><span className="font-medium text-foreground">Customer note: </span><span className="text-muted-foreground">{order.customerNotes}</span></p>}
                {order.designerNotes && <p><span className="font-medium text-foreground">Designer note: </span><span className="text-muted-foreground">{order.designerNotes}</span></p>}
                {order.privateNotes && <p><span className="font-medium text-foreground">Private note: </span><span className="text-muted-foreground">{order.privateNotes}</span></p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Pricing Breakdown</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
            <Detail label="Fabric Cost" value={money(order.fabricCost)} />
            <Detail label="Customization" value={money(order.customizationCost)} />
            <Detail label="Additional Services" value={money(order.additionalServicesCost)} />
            <Detail label="Delivery Fee" value={money(order.deliveryFee)} />
            <Detail label="Discount" value={`-${money(order.discount)}`} />
            <Detail label="Tax" value={money(order.tax)} />
            <Detail label="Subtotal" value={money(order.subtotal)} />
            <Detail label="Deposit Required" value={money(order.depositRequired)} />
          </dl>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-base font-semibold text-foreground">{money(order.totalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount Paid</p>
              <p className="text-base font-semibold text-success">{money(order.amountPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance Due</p>
              <p className="text-base font-semibold text-foreground">{money(balanceDue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
