"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface CustomerPreferencesValue {
  fabricPreferences: string[];
  colorPreferences: string[];
  stylePreferences: string[];
  bodyShapeNotes: string | null;
  specialInstructions: string | null;
}

export function CustomerPreferencesPanel({
  customerId,
  preferences,
}: {
  customerId: string;
  preferences: CustomerPreferencesValue | null;
}) {
  const router = useRouter();
  const [fabric, setFabric] = useState(preferences?.fabricPreferences.join(", ") ?? "");
  const [color, setColor] = useState(preferences?.colorPreferences.join(", ") ?? "");
  const [style, setStyle] = useState(preferences?.stylePreferences.join(", ") ?? "");
  const [bodyShapeNotes, setBodyShapeNotes] = useState(preferences?.bodyShapeNotes ?? "");
  const [specialInstructions, setSpecialInstructions] = useState(preferences?.specialInstructions ?? "");
  const [saving, setSaving] = useState(false);

  function splitList(value: string) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabricPreferences: splitList(fabric),
          colorPreferences: splitList(color),
          stylePreferences: splitList(style),
          bodyShapeNotes,
          specialInstructions,
        }),
      });
      if (!res.ok) throw new Error("Could not save preferences");
      toast.success("Preferences saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Fabric Preferences</Label>
          <Input value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Silk, Ankara, Lace" />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred Colours</Label>
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Burgundy, Gold" />
        </div>
        <div className="space-y-1.5">
          <Label>Favourite Styles</Label>
          <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Fitted, A-line" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Body Shape Notes</Label>
        <Textarea rows={2} value={bodyShapeNotes} onChange={(e) => setBodyShapeNotes(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Special Instructions</Label>
        <Textarea rows={2} value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
