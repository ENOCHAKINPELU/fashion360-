"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineItemsEditor } from "@/features/quotations/components/line-items-editor";
import { PricingTermsFields, type PricingTermsValue } from "@/features/quotations/components/pricing-terms-fields";
import type { FinancialLineItemInput } from "@/lib/validations/quotation";
import { formatCurrency } from "@/lib/utils";

const EMPTY_ITEM: FinancialLineItemInput = { type: "GARMENT", name: "", description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 0 };
const EMPTY_TERMS: PricingTermsValue = {
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
};

export function CreateQuotationDialog({ designPreviewId, currency }: { designPreviewId: string; currency: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<FinancialLineItemInput[]>([{ ...EMPTY_ITEM }]);
  const [terms, setTerms] = useState<PricingTermsValue>({ ...EMPTY_TERMS });
  const [productionDays, setProductionDays] = useState("");
  const [includedRevisions, setIncludedRevisions] = useState("");
  const [additionalRevisionCost, setAdditionalRevisionCost] = useState("");
  const [lateChangePolicy, setLateChangePolicy] = useState("");

  const itemsSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const grandTotal = itemsSubtotal - terms.discount + terms.tax + terms.deliveryFee + terms.additionalCharges;

  function reset() {
    setItems([{ ...EMPTY_ITEM }]);
    setTerms({ ...EMPTY_TERMS });
    setProductionDays("");
    setIncludedRevisions("");
    setAdditionalRevisionCost("");
    setLateChangePolicy("");
  }

  async function submit() {
    if (items.some((i) => !i.name.trim())) {
      toast.error("Every line item needs a name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designPreviewId,
          items,
          discount: terms.discount,
          tax: terms.tax,
          deliveryFee: terms.deliveryFee,
          additionalCharges: terms.additionalCharges,
          productionDays: productionDays || undefined,
          includedRevisions: includedRevisions || undefined,
          additionalRevisionCost: additionalRevisionCost || undefined,
          lateChangePolicy: lateChangePolicy || undefined,
          paymentTerms: terms.paymentTerms || undefined,
          cancellationPolicy: terms.cancellationPolicy || undefined,
          refundPolicy: terms.refundPolicy || undefined,
          alterationPolicy: terms.alterationPolicy || undefined,
          deliveryPolicy: terms.deliveryPolicy || undefined,
          customTerms: terms.customTerms || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the quotation");
      toast.success("Quotation created");
      setOpen(false);
      reset();
      router.push(`/dashboard/quotations/${data.quotation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the quotation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-1.5">
          <FileText className="size-4" /> Create Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a quotation</DialogTitle>
          <DialogDescription>Price this approved design. You can review and edit before sending it to the customer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <LineItemsEditor items={items} onChange={setItems} currency={currency} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Production Time (days)</Label>
              <Input value={productionDays} onChange={(e) => setProductionDays(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 14" />
            </div>
            <div className="space-y-1.5">
              <Label>Included Revisions</Label>
              <Input value={includedRevisions} onChange={(e) => setIncludedRevisions(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 2" />
            </div>
            <div className="space-y-1.5">
              <Label>Additional Revision Cost</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={additionalRevisionCost}
                onChange={(e) => setAdditionalRevisionCost(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Late Change Policy</Label>
            <Input value={lateChangePolicy} onChange={(e) => setLateChangePolicy(e.target.value)} placeholder="e.g. Changes after production starts incur a fee" />
          </div>

          <PricingTermsFields value={terms} onChange={(patch) => setTerms((t) => ({ ...t, ...patch }))} />

          <div className="rounded-xl border border-border bg-surface p-4 text-right">
            <p className="text-sm text-muted-foreground">
              Grand Total: <span className="text-lg font-semibold text-foreground">{formatCurrency(grandTotal, currency)}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
