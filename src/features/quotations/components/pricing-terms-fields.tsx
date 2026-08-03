"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PricingTermsValue {
  discount: number;
  tax: number;
  deliveryFee: number;
  additionalCharges: number;
  paymentTerms: string;
  cancellationPolicy: string;
  refundPolicy: string;
  alterationPolicy: string;
  deliveryPolicy: string;
  customTerms: string;
}

export function PricingTermsFields({
  value,
  onChange,
  showDeposit,
  depositPercentage,
  onDepositPercentageChange,
}: {
  value: PricingTermsValue;
  onChange: (patch: Partial<PricingTermsValue>) => void;
  showDeposit?: boolean;
  depositPercentage?: number;
  onDepositPercentageChange?: (value: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Discount</Label>
          <Input type="number" min={0} step="0.01" value={value.discount} onChange={(e) => onChange({ discount: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Tax</Label>
          <Input type="number" min={0} step="0.01" value={value.tax} onChange={(e) => onChange({ tax: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Delivery Fee</Label>
          <Input type="number" min={0} step="0.01" value={value.deliveryFee} onChange={(e) => onChange({ deliveryFee: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Additional Charges</Label>
          <Input type="number" min={0} step="0.01" value={value.additionalCharges} onChange={(e) => onChange({ additionalCharges: Number(e.target.value) })} />
        </div>
      </div>

      {showDeposit && (
        <div className="space-y-1.5 sm:w-56">
          <Label>Deposit Percentage</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step="1"
            value={depositPercentage}
            onChange={(e) => onDepositPercentageChange?.(Number(e.target.value))}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Payment Terms</Label>
          <Textarea rows={2} value={value.paymentTerms} onChange={(e) => onChange({ paymentTerms: e.target.value })} placeholder="e.g. 50% deposit, balance before delivery" />
        </div>
        <div className="space-y-1.5">
          <Label>Cancellation Policy</Label>
          <Textarea rows={2} value={value.cancellationPolicy} onChange={(e) => onChange({ cancellationPolicy: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Refund Policy</Label>
          <Textarea rows={2} value={value.refundPolicy} onChange={(e) => onChange({ refundPolicy: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Alteration Policy</Label>
          <Textarea rows={2} value={value.alterationPolicy} onChange={(e) => onChange({ alterationPolicy: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Delivery Policy</Label>
          <Textarea rows={2} value={value.deliveryPolicy} onChange={(e) => onChange({ deliveryPolicy: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Custom Terms</Label>
          <Textarea rows={2} value={value.customTerms} onChange={(e) => onChange({ customTerms: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
