"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pause, Play, CheckCircle2, Save, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeasurementValuesEditor } from "@/features/measurements/components/measurement-values-editor";
import { fitPreferenceOptions } from "@/lib/validations/measurement";
import type { MeasurementTypeItem, MeasurementSessionItem } from "@/features/measurements/types";

export function ManualSessionForm({
  session,
  types,
  requiredKeys,
}: {
  session: MeasurementSessionItem;
  types: MeasurementTypeItem[];
  requiredKeys: Set<string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number | undefined>>(session.draftValues ?? {});
  const [unit, setUnit] = useState<"METRIC" | "IMPERIAL">("METRIC");
  const [fitPreference, setFitPreference] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const isPaused = session.status === "PAUSED";
  const skipNextSave = useRef(true);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const handle = setTimeout(() => {
      setSaving(true);
      fetch(`/api/measurements/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftValues: values }),
      }).finally(() => setSaving(false));
    }, 1200);
    return () => clearTimeout(handle);
  }, [values, session.id]);

  function updateValue(key: string, value: number | undefined) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function saveDraft() {
    setBusy(true);
    try {
      await fetch(`/api/measurements/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftValues: values }),
      });
      toast.success("Draft saved");
    } finally {
      setBusy(false);
    }
  }

  async function togglePause() {
    setBusy(true);
    try {
      const res = await fetch(`/api/measurements/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isPaused ? "resume" : "pause" }),
      });
      if (!res.ok) throw new Error("Could not update session");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    const missing = Array.from(requiredKeys).filter((key) => values[key] === undefined);
    if (missing.length > 0) {
      toast.error(`Missing ${missing.length} required measurement${missing.length > 1 ? "s" : ""}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/measurements/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          values,
          unit,
          fitPreference: fitPreference || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not complete session");
      toast.success("Measurement saved");
      router.push(`/dashboard/measurements/${json.session.resultMeasurementId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Select value={unit} onValueChange={(v) => setUnit(v as "METRIC" | "IMPERIAL")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="METRIC">Centimeters</SelectItem>
              <SelectItem value="IMPERIAL">Inches</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fitPreference} onValueChange={setFitPreference}>
            <SelectTrigger className="w-40">
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
          {saving && <span className="text-xs text-muted-foreground">Saving draft...</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-3.5" /> Print Sheet
          </Button>
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={busy} className="gap-1.5">
            <Save className="size-3.5" /> Save Draft
          </Button>
          <Button variant="outline" size="sm" onClick={togglePause} disabled={busy} className="gap-1.5">
            {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" onClick={complete} disabled={busy || isPaused} className="gap-1.5">
            <CheckCircle2 className="size-3.5" /> Complete
          </Button>
        </div>
      </div>

      {isPaused && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-warning print:hidden">
          Session paused. Resume to continue recording measurements.
        </div>
      )}

      <Card className="border-none shadow-sm">
        <CardContent>
          <fieldset disabled={isPaused} className="disabled:opacity-60">
            <MeasurementValuesEditor types={types} values={values} onChange={updateValue} unit={unit} requiredKeys={requiredKeys} />
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
