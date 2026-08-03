"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MEASUREMENT_FIELDS } from "@/lib/validations/measurement";

// Part 15/27: manual capture only. Save Draft keeps editing before the
// customer sees anything; Submit for Review notifies the customer and
// starts the Confirm / Request Correction flow in their own Vault.
export function CaptureMeasurementsDialog({
  open,
  onOpenChange,
  appointmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
}) {
  const router = useRouter();
  const [unit, setUnit] = useState<"METRIC" | "IMPERIAL">("METRIC");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function save(submitForReview: boolean) {
    setSubmitting(true);
    try {
      const numericValues = Object.fromEntries(
        Object.entries(values)
          .filter(([, v]) => v.trim() !== "")
          .map(([k, v]) => [k, Number(v)])
      );
      if (Object.keys(numericValues).length === 0) throw new Error("Enter at least one measurement");

      const res = await fetch(`/api/business/appointments/${appointmentId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: numericValues, unit, notes: notes || undefined, submitForReview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save measurements");
      toast.success(submitForReview ? "Submitted for customer review" : "Saved as draft");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save measurements");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture Measurements</DialogTitle>
          <DialogDescription>Recorded into the customer&apos;s own Measurement Vault, they&apos;ll review and confirm.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as "METRIC" | "IMPERIAL")}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="METRIC">Centimeters</SelectItem>
                <SelectItem value="IMPERIAL">Inches</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MEASUREMENT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => save(false)} disabled={submitting}>
            Save Draft
          </Button>
          <Button onClick={() => save(true)} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit for Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
