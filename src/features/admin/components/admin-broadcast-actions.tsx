"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const TARGETS = [
  { value: "ALL_USERS", label: "All Users" },
  { value: "CUSTOMERS", label: "Customers" },
  { value: "DESIGNERS", label: "Designers" },
  { value: "SEGMENT", label: "Specific Segment" },
] as const;

const SEGMENTS = [
  { value: "VERIFIED_DESIGNERS", label: "Verified Designers" },
  { value: "UNVERIFIED_DESIGNERS", label: "Unverified Designers" },
  { value: "SUSPENDED_ACCOUNTS", label: "Suspended Accounts" },
  { value: "HIGH_VALUE_CUSTOMERS", label: "High-Value Customers" },
  { value: "INACTIVE_CUSTOMERS", label: "Inactive Customers (90+ days)" },
] as const;

// Admin Phase 10 — platform-wide announcements. Two steps by design: Save
// creates a DRAFT (or SCHEDULED, if a send time is set) so a broadcast can
// be prepared and reviewed before going out; the confirm dialog on Send Now
// is the one place this actually reaches real users, so it's the one
// place that gets a second "are you sure" with the resolved recipient
// count shown up front.
export function NewBroadcastDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<(typeof TARGETS)[number]["value"]>("ALL_USERS");
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]["value"]>("VERIFIED_DESIGNERS");
  const [channel, setChannel] = useState<"IN_APP" | "EMAIL">("IN_APP");
  const [scheduledFor, setScheduledFor] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCounting(true);
    const controller = new AbortController();
    fetch("/api/admin/broadcasts/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, segment: target === "SEGMENT" ? segment : undefined }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setRecipientCount(typeof data.count === "number" ? data.count : null))
      .catch(() => setRecipientCount(null))
      .finally(() => setCounting(false));
    return () => controller.abort();
  }, [open, target, segment]);

  function reset() {
    setTitle("");
    setBody("");
    setTarget("ALL_USERS");
    setChannel("IN_APP");
    setScheduledFor("");
    setExpiresAt("");
    setRecipientCount(null);
  }

  async function save() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          target,
          segment: target === "SEGMENT" ? segment : undefined,
          channel,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create broadcast");
      toast.success(scheduledFor ? "Broadcast scheduled" : "Broadcast saved as draft");
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create broadcast");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-4" /> New Broadcast
          </DialogTitle>
          <DialogDescription>Saved as a draft (or scheduled, if you set a send time) — nothing goes out until you send it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title">Title</Label>
            <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="e.g. Scheduled maintenance this weekend" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-body">Message</Label>
            <Textarea id="bc-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} placeholder="What should recipients know?" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bc-target">Target</Label>
              <select
                id="bc-target"
                value={target}
                onChange={(e) => setTarget(e.target.value as typeof target)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {TARGETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bc-channel">Channel</Label>
              <select
                id="bc-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as typeof channel)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="IN_APP">In-App</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
          </div>
          {target === "SEGMENT" && (
            <div className="space-y-1.5">
              <Label htmlFor="bc-segment">Segment</Label>
              <select
                id="bc-segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value as typeof segment)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bc-schedule">Schedule (optional)</Label>
              <Input id="bc-schedule" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bc-expiry">Expiry (optional)</Label>
              <Input id="bc-expiry" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {counting ? "Calculating recipients..." : recipientCount === null ? "Couldn't calculate recipients" : `Will reach ${recipientCount.toLocaleString()} recipient${recipientCount === 1 ? "" : "s"} right now.`}
          </div>

          {(title || body) && (
            <div className="rounded-lg border border-dashed border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{title || "(no title yet)"}</p>
              <p className="text-sm text-muted-foreground">{body || "(no message yet)"}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={submitting}>
            {submitting ? "Saving..." : scheduledFor ? "Schedule Broadcast" : "Save as Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SendBroadcastButton({ broadcastId, recipientCount }: { broadcastId: string; recipientCount: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function send() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${broadcastId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send broadcast");
      toast.success(`Sent to ${data.broadcast?.recipientCount ?? "all"} recipients`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send broadcast");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Send className="size-3.5" /> Send Now
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send this broadcast now?</DialogTitle>
          <DialogDescription>
            {recipientCount === null ? "This will dispatch a real notification to every matching recipient." : `This will dispatch a real notification to ${recipientCount.toLocaleString()} recipient${recipientCount === 1 ? "" : "s"} immediately.`} This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={send} disabled={submitting}>
            {submitting ? "Sending..." : "Send Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelBroadcastButton({ broadcastId }: { broadcastId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function cancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${broadcastId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel broadcast");
      toast.success("Broadcast cancelled");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel broadcast");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setOpen(true)}>
        <Ban className="size-3.5" /> Cancel
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this scheduled broadcast?</DialogTitle>
          <DialogDescription>It will not be sent.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep It
          </Button>
          <Button variant="destructive" onClick={cancel} disabled={submitting}>
            {submitting ? "Cancelling..." : "Cancel Broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
