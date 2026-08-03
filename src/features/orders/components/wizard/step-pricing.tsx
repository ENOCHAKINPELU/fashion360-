"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { OrderPricingInput } from "@/lib/validations/order";

const PRICING_FIELDS: { key: keyof OrderPricingInput; label: string }[] = [
  { key: "fabricCost", label: "Fabric Cost" },
  { key: "customizationCost", label: "Customization Cost" },
  { key: "additionalServicesCost", label: "Additional Services Cost" },
  { key: "deliveryFee", label: "Delivery Fee" },
  { key: "discount", label: "Discount" },
  { key: "tax", label: "Tax" },
  { key: "depositRequired", label: "Deposit Required" },
];

export function StepPricing({
  pricing,
  basePrice,
  onChange,
}: {
  pricing: OrderPricingInput;
  basePrice: number;
  onChange: (patch: Partial<OrderPricingInput>) => void;
}) {
  const subtotal =
    basePrice + pricing.fabricCost + pricing.customizationCost + pricing.additionalServicesCost;
  const totalValue = Math.max(0, subtotal + pricing.deliveryFee + pricing.tax - pricing.discount);
  const balanceDue = totalValue;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Price Summary</h2>
        <p className="text-sm text-muted-foreground">Enter cost line items to compute the order total.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Base Price (read-only)</Label>
        <Input type="text" value={`₦${basePrice.toLocaleString()}`} readOnly disabled />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PRICING_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label>{field.label} (₦)</Label>
            <Input
              type="number"
              min="0"
              value={pricing[field.key] || ""}
              onChange={(e) => onChange({ [field.key]: Number(e.target.value) || 0 } as Partial<OrderPricingInput>)}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-accent-soft p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">₦{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Order Value</span>
          <span className="font-semibold text-foreground">₦{totalValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Deposit Required</span>
          <span className="font-medium text-foreground">₦{pricing.depositRequired.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Outstanding Balance</span>
          <span className="font-medium text-foreground">₦{balanceDue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
