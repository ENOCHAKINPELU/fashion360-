"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Admin Phase 10 — the two simple, non-destructive actions in the
// Notification Center: retry a failed notification, resolve a system
// alert. Neither needs a confirm dialog (retrying can't make anything
// worse, and resolving an alert is easily reopened by a new one) — matches
// this app's existing convention of only gating genuinely destructive or
// hard-to-reverse actions behind a dialog.
export function RetryNotificationButton({ notificationLogId }: { notificationLogId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function retry() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/notifications/${notificationLogId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Retry failed");
      toast.success(data.notification?.status === "SENT" ? "Retried — now sent" : "Retried — still failed, see the failure reason");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="gap-1.5" onClick={retry} disabled={submitting}>
      <RotateCw className="size-3.5" /> {submitting ? "Retrying..." : "Retry"}
    </Button>
  );
}

export function ResolveSystemAlertButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function resolve() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/system-alerts/${alertId}/resolve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resolve");
      toast.success("Alert resolved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="gap-1.5" onClick={resolve} disabled={submitting}>
      <CheckCircle2 className="size-3.5" /> {submitting ? "Resolving..." : "Resolve"}
    </Button>
  );
}
