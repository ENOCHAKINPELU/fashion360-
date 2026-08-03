"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TERMINAL = new Set(["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"]);

export function ServiceRequestActions({
  requestId,
  status,
  canAccept,
}: {
  requestId: string;
  status: string;
  canAccept: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function respond(type: "CUSTOMER_ACCEPTED" | "CUSTOMER_DECLINED" | "MESSAGE") {
    if (type === "MESSAGE" && !message.trim()) {
      toast.error("Write a message first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/service-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not send response");
      toast.success(type === "CUSTOMER_ACCEPTED" ? "You're now connected!" : type === "CUSTOMER_DECLINED" ? "Request declined" : "Message sent");
      setMessage("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send response");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/service-requests/${requestId}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not cancel request");
      toast.success("Request cancelled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel request");
    } finally {
      setSubmitting(false);
    }
  }

  if (TERMINAL.has(status)) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Textarea
          rows={2}
          placeholder="Continue the conversation…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => respond("MESSAGE")} disabled={submitting}>
            Send Message
          </Button>
          {canAccept && (
            <>
              <Button size="sm" onClick={() => respond("CUSTOMER_ACCEPTED")} disabled={submitting}>
                Accept
              </Button>
              <Button size="sm" variant="outline" className="text-danger hover:text-danger" onClick={() => respond("CUSTOMER_DECLINED")} disabled={submitting}>
                Decline
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={cancel} disabled={submitting}>
            Cancel Request
          </Button>
        </div>
      </div>
    </div>
  );
}
