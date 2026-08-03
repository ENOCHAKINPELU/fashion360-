"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { PrivacySettingsInput } from "@/lib/validations/customer-account";

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private, only me" },
  { value: "BUSINESS_ONLY", label: "Businesses I work with" },
  { value: "PUBLIC", label: "Public" },
];

// Foundation only (Part 15) — a full privacy-management UI comes later;
// this gives customers visible, working control over the defaults.
export function PrivacySettingsForm({ defaultValues }: { defaultValues: PrivacySettingsInput }) {
  const router = useRouter();
  const [settings, setSettings] = useState(defaultValues);

  async function update(patch: Partial<PrivacySettingsInput>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      const res = await fetch("/api/privacy-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Could not save");
      router.refresh();
    } catch {
      toast.error("Could not save your privacy settings");
      setSettings(settings);
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="space-y-1.5">
        <Label>Profile Visibility</Label>
        <Select value={settings.profileVisibility} onValueChange={(v) => update({ profileVisibility: v as PrivacySettingsInput["profileVisibility"] })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {[
        { key: "allowMeasurementAccessByDefault" as const, label: "Share measurements with new businesses by default" },
        { key: "allowDesignSharing" as const, label: "Allow designs to be shared with me" },
        { key: "allowOrderDataAccess" as const, label: "Allow businesses to access my order data" },
      ].map((item) => (
        <label key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-3 text-sm">
          <span className="text-foreground">{item.label}</span>
          <input
            type="checkbox"
            checked={settings[item.key]}
            onChange={(e) => update({ [item.key]: e.target.checked })}
          />
        </label>
      ))}
    </div>
  );
}
