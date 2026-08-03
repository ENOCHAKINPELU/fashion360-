"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Part 5's "Availability" filter reads this — separate from profile
// visibility, so a business can stay publicly listed while temporarily
// pausing new requests.
export function DiscoveryAvailabilityToggle({ initialAcceptingRequests }: { initialAcceptingRequests: boolean }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(initialAcceptingRequests);
  const [submitting, setSubmitting] = useState(false);

  async function toggle(next: boolean) {
    setAccepting(next);
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/discovery-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAcceptingRequests: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setAccepting(!next);
      toast.error("Could not update availability");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <label className="flex items-center gap-2">
      <Switch checked={accepting} onCheckedChange={toggle} disabled={submitting} />
      <Label className="cursor-pointer">{accepting ? "Accepting new requests" : "Not accepting requests"}</Label>
    </label>
  );
}
