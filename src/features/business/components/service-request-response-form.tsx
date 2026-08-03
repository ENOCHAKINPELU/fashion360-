"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BusinessResponseInput } from "@/lib/validations/service";

const TYPE_OPTIONS = [
  { value: "ACCEPTED", label: "Accept Request" },
  { value: "DECLINED", label: "Decline Request" },
  { value: "INFO_REQUESTED", label: "Request More Information" },
  { value: "ALTERNATIVE_DATE_PROPOSED", label: "Propose Alternative Date" },
  { value: "MESSAGE", label: "Send a Message" },
];

const TERMINAL = new Set(["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"]);

export function ServiceRequestResponseForm({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [type, setType] = useState<BusinessResponseInput["type"]>("MESSAGE");
  const [message, setMessage] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [estimatedPriceMin, setEstimatedPriceMin] = useState("");
  const [estimatedPriceMax, setEstimatedPriceMax] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (TERMINAL.has(status)) {
    return <p className="text-sm text-muted-foreground">This request has already been resolved.</p>;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/business/service-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim() || undefined,
          proposedDate: proposedDate || undefined,
          estimatedPriceMin: estimatedPriceMin || undefined,
          estimatedPriceMax: estimatedPriceMax || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not send response");
      toast.success("Response sent");
      setMessage("");
      setProposedDate("");
      setEstimatedPriceMin("");
      setEstimatedPriceMax("");
      setType("MESSAGE");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Response Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as BusinessResponseInput["type"])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "ALTERNATIVE_DATE_PROPOSED" && (
        <div className="space-y-1.5">
          <Label>Proposed Date</Label>
          <Input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} />
        </div>
      )}

      {type === "ACCEPTED" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Estimated Price Min</Label>
            <Input type="number" min={0} value={estimatedPriceMin} onChange={(e) => setEstimatedPriceMin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Estimated Price Max</Label>
            <Input type="number" min={0} value={estimatedPriceMax} onChange={(e) => setEstimatedPriceMax(e.target.value)} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Message {type === "MESSAGE" ? "" : "(optional)"}</Label>
        <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <Button onClick={submit} disabled={submitting || (type === "MESSAGE" && !message.trim())}>
        {submitting ? "Sending..." : "Send Response"}
      </Button>
    </div>
  );
}
