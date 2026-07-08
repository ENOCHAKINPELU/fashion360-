"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MEASUREMENT_FIELDS } from "@/lib/validations/measurement";

type Estimate = Record<string, number>;

export function MeasurementFormDialog({
  open,
  onClose,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [saving, setSaving] = useState(false);

  async function onEstimate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstimating(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/measurements/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heightCm: form.get("heightCm"),
        weightKg: form.get("weightKg"),
        gender: form.get("gender"),
        frontImageUrl: form.get("frontImageUrl") || "pending-upload://front",
        sideImageUrl: form.get("sideImageUrl") || "pending-upload://side",
      }),
    });

    setEstimating(false);
    if (!res.ok) {
      toast.error("Could not generate an estimate");
      return;
    }
    const data = await res.json();
    setEstimate(data.estimate);
    toast.info("Estimate generated — review and approve before saving.");
  }

  async function onSaveManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      customerId,
      label: form.get("label") || "Measurement Profile",
      source: "MANUAL",
      notes: form.get("notes"),
    };
    for (const f of MEASUREMENT_FIELDS) payload[f.key] = form.get(f.key) || null;

    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save measurements");
      return;
    }
    toast.success("Measurement profile saved");
    onClose();
    router.refresh();
  }

  async function onApproveEstimate() {
    if (!estimate) return;
    setSaving(true);

    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        label: "AI-Estimated Profile",
        source: "AI_ESTIMATED",
        ...estimate,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save measurements");
      return;
    }
    toast.success("AI estimate approved and saved");
    setEstimate(null);
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add measurement profile">
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "manual" ? "primary" : "outline"}
          onClick={() => setMode("manual")}
        >
          Manual entry
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "ai" ? "primary" : "outline"}
          onClick={() => setMode("ai")}
        >
          AI-assisted estimate
        </Button>
      </div>

      {mode === "manual" ? (
        <form onSubmit={onSaveManual} className="space-y-4">
          <div>
            <Label htmlFor="label">Profile label</Label>
            <Input id="label" name="label" defaultValue="Measurement Profile" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {MEASUREMENT_FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label} (cm)</Label>
                <Input id={f.key} name={f.key} type="number" step="0.1" />
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="rounded-xl bg-info-soft px-4 py-3 text-xs text-info">
            This estimate is generated from height, weight, and gender using a placeholder
            model. Review every value before approving — it is not a substitute for a
            professional fitting.
          </p>
          {!estimate ? (
            <form onSubmit={onEstimate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="heightCm">Height (cm)</Label>
                  <Input id="heightCm" name="heightCm" type="number" step="0.1" required />
                </div>
                <div>
                  <Label htmlFor="weightKg">Weight (kg)</Label>
                  <Input id="weightKg" name="weightKg" type="number" step="0.1" required />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select id="gender" name="gender" required defaultValue="">
                    <option value="" disabled>
                      Select...
                    </option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="frontImageUrl">Front photo URL</Label>
                <Input id="frontImageUrl" name="frontImageUrl" placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="sideImageUrl">Side photo URL</Label>
                <Input id="sideImageUrl" name="sideImageUrl" placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={estimating}>
                  {estimating ? "Estimating..." : "Generate estimate"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {MEASUREMENT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={`est-${f.key}`}>{f.label} (cm)</Label>
                    <Input
                      id={`est-${f.key}`}
                      type="number"
                      step="0.1"
                      value={estimate[f.key] ?? ""}
                      onChange={(e) =>
                        setEstimate((prev) => ({ ...prev!, [f.key]: parseFloat(e.target.value) }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEstimate(null)}>
                  Back
                </Button>
                <Button type="button" onClick={onApproveEstimate} disabled={saving}>
                  {saving ? "Saving..." : "Approve & save"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
