"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeasurementValuesEditor } from "@/features/measurements/components/measurement-values-editor";
import { fitPreferenceOptions } from "@/lib/validations/measurement";
import type { MeasurementTypeItem, MeasurementRecordItem } from "@/features/measurements/types";

export function MeasurementValuesPanel({
  measurement,
  types,
}: {
  measurement: MeasurementRecordItem;
  types: MeasurementTypeItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(measurement.status === "PENDING_REVIEW");
  const [values, setValues] = useState<Record<string, number | undefined>>(measurement.values);
  const [fitPreference, setFitPreference] = useState(measurement.fitPreference ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPendingReview = measurement.status === "PENDING_REVIEW";

  function updateValue(key: string, value: number | undefined) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function approve() {
    setSubmitting(true);
    try {
      const cleanValues = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) as Record<string, number>;
      const res = await fetch(`/api/measurements/${measurement.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: cleanValues, fitPreference: fitPreference || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not approve measurement");
      toast.success("Measurement approved");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit() {
    setSubmitting(true);
    try {
      const cleanValues = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) as Record<string, number>;
      const res = await fetch(`/api/measurements/${measurement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: cleanValues, fitPreference: fitPreference || undefined, reason }),
      });
      if (!res.ok) throw new Error("Could not update measurement");
      toast.success("Measurement updated");
      setEditing(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {isPendingReview && (
        <div className="rounded-xl border border-info/30 bg-info-soft px-4 py-2.5 text-sm text-info">
          This measurement was estimated from photos. Review and adjust the values below, then approve it.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={fitPreference} onValueChange={setFitPreference} disabled={!editing}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Fit preference" />
          </SelectTrigger>
          <SelectContent>
            {fitPreferenceOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isPendingReview && (
          <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)} className="gap-1.5">
            {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? "Cancel" : "Edit"}
          </Button>
        )}
      </div>

      <MeasurementValuesEditor types={types} values={editing ? values : measurement.values} onChange={updateValue} unit={measurement.unit} />

      {editing && !isPendingReview && (
        <div className="space-y-1.5">
          <Label>Reason for change</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are these measurements being updated?" />
        </div>
      )}

      {editing && (
        <Button onClick={isPendingReview ? approve : saveEdit} disabled={submitting} className="gap-1.5">
          <CheckCircle2 className="size-4" />
          {submitting ? "Saving..." : isPendingReview ? "Approve Measurement" : "Save Changes"}
        </Button>
      )}
    </div>
  );
}
