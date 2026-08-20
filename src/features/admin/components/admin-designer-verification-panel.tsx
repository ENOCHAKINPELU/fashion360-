"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Same two endpoints the verification queue (/admin/verifications) already
// uses — this is a lighter panel for the designer's own profile page,
// which (unlike the queue) needs to work for a business at ANY status, not
// only a freshly-submitted PENDING request. Request Info is the one action
// that has no queue-page equivalent: it never changes status, just notifies.
export function AdminDesignerVerificationPanel({ businessId, status }: { businessId: string; status: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function decide(decision: "VERIFIED" | "REJECTED") {
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Explain why, so the business knows what to fix");
      return;
    }
    setSubmitting(decision);
    try {
      const res = await fetch(`/api/admin/verifications/${businessId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record this decision");
      toast.success(decision === "VERIFIED" ? "Business verified" : "Verification declined");
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record this decision");
    } finally {
      setSubmitting(null);
    }
  }

  async function requestInfo() {
    if (!note.trim()) {
      toast.error("Enter what you need from them");
      return;
    }
    setSubmitting("info");
    try {
      const res = await fetch(`/api/admin/verifications/${businessId}/request-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send this request");
      toast.success("Request sent to the business");
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send this request");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="verification-note">Note</Label>
        <Textarea
          id="verification-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Required to decline or request info; optional to verify"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!!submitting || status === "VERIFIED"} onClick={() => decide("VERIFIED")}>
          {submitting === "VERIFIED" ? "Verifying..." : "Verify"}
        </Button>
        <Button variant="outline" size="sm" disabled={!!submitting || status === "REJECTED"} onClick={() => decide("REJECTED")}>
          {submitting === "REJECTED" ? "Declining..." : "Reject"}
        </Button>
        <Button variant="outline" size="sm" disabled={!!submitting} onClick={requestInfo}>
          {submitting === "info" ? "Sending..." : "Request More Information"}
        </Button>
      </div>
    </div>
  );
}
