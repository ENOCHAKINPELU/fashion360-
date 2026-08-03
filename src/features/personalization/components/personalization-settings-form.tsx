"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Settings {
  personalizationEnabled: boolean;
  locationDiscoveryEnabled: boolean;
  notifyNewDesignsFromSaved: boolean;
  notifyStyleMatches: boolean;
  notifySavedDesignerServices: boolean;
}

const TOGGLES: { key: keyof Settings; label: string; description: string }[] = [
  { key: "personalizationEnabled", label: "Personalized recommendations", description: "Use your activity and preferences to personalize discovery." },
  { key: "locationDiscoveryEnabled", label: "Location-aware discovery", description: "Show designers and services near you." },
  { key: "notifyNewDesignsFromSaved", label: "New designs from saved designers", description: "Get notified when a designer you saved posts something new." },
  { key: "notifyStyleMatches", label: "Style match notifications", description: "Get notified about collections that match your style." },
  { key: "notifySavedDesignerServices", label: "Saved designer service updates", description: "Get notified when a designer you follow adds a new service." },
];

export function PersonalizationSettingsForm({ defaultValues, preferences }: { defaultValues: Settings; preferences: { priceRangeMin: number | null; priceRangeMax: number | null } }) {
  const router = useRouter();
  const [settings, setSettings] = useState(defaultValues);
  const [priceMin, setPriceMin] = useState(preferences.priceRangeMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(preferences.priceRangeMax?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function toggle(key: keyof Settings, value: boolean) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await fetch("/api/customer/personalization-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => toast.error("Could not save setting"));
  }

  async function savePriceRange() {
    setSaving(true);
    try {
      await fetch("/api/customer/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceRangeMin: priceMin ? Number(priceMin) : null, priceRangeMax: priceMax ? Number(priceMax) : null }),
      });
      toast.success("Price range saved");
    } catch {
      toast.error("Could not save price range");
    } finally {
      setSaving(false);
    }
  }

  async function runControl(action: "recommendation-history" | "activity-history" | "reset-preferences", label: string) {
    if (!confirm(`Are you sure you want to ${label.toLowerCase()}? This can't be undone.`)) return;
    setBusyAction(action);
    try {
      if (action === "reset-preferences") {
        await fetch("/api/customer/reset-preferences", { method: "POST" });
      } else {
        await fetch(`/api/customer/${action}`, { method: "DELETE" });
      }
      toast.success(`${label} complete`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
            <div>
              <Label>{t.label}</Label>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
            <Switch checked={settings[t.key]} onCheckedChange={(v) => toggle(t.key, v)} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Preferred Price Range (NGN)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" min={0} value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" min={0} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max" />
          <Button size="sm" onClick={savePriceRange} disabled={saving}>
            Save
          </Button>
        </div>
      </div>

      <Card className="border-none bg-danger-soft shadow-sm">
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-danger">Data Controls</p>
          <p className="text-xs text-danger/80">You stay in control of your personalization data.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busyAction !== null} onClick={() => runControl("recommendation-history", "Clear recommendation history")}>
              Clear Recommendation History
            </Button>
            <Button size="sm" variant="outline" disabled={busyAction !== null} onClick={() => runControl("activity-history", "Delete activity history")}>
              Delete Activity History
            </Button>
            <Button size="sm" variant="outline" disabled={busyAction !== null} onClick={() => runControl("reset-preferences", "Reset preferences")}>
              Reset Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
