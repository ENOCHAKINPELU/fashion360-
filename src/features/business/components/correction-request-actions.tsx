"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CorrectionRequestActions({ correctionId }: { correctionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function respond(action: "accept" | "reject" | "request-new-session") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/business/measurement-corrections/${correctionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not respond");
      toast.success("Response sent");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not respond");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button size="sm" disabled={submitting} onClick={() => respond("accept")}>
        Accept Correction
      </Button>
      <Button size="sm" variant="outline" disabled={submitting} onClick={() => respond("reject")}>
        Reject
      </Button>
      <Button size="sm" variant="outline" disabled={submitting} onClick={() => respond("request-new-session")}>
        Request New Session
      </Button>
    </div>
  );
}
