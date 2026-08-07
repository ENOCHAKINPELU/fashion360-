"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferencesInput } from "@/lib/validations/profile";

// Email is the only channel Fashion360 can actually deliver today — SMS,
// WhatsApp, and push were removed rather than left as toggles that saved a
// preference nothing ever reads. All in-app activity (orders, appointments,
// design updates) is always visible in the notification bell regardless of
// this setting; this only controls the emailed copy of those updates.
const CHANNELS: { key: keyof NotificationPreferencesInput; label: string; description: string }[] = [
  { key: "email", label: "Email", description: "Order, appointment, and payment updates by email." },
];

export function NotificationsForm({ defaultValues }: { defaultValues?: Partial<NotificationPreferencesInput> }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferencesInput>({
    email: true,
    ...defaultValues,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: prefs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      toast.success("Notification preferences updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="divide-y divide-border rounded-xl border border-border">
        {CHANNELS.map((channel) => (
          <div key={channel.key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{channel.label}</p>
              <p className="text-xs text-muted-foreground">{channel.description}</p>
            </div>
            <Switch
              checked={prefs[channel.key]}
              onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, [channel.key]: checked }))}
            />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
