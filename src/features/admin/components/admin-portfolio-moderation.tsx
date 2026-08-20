"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminPortfolioModeration({ businessId, itemId, status }: { businessId: string; itemId: string; status: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED" | "UPDATE_REQUESTED") {
    setSubmitting(decision);
    try {
      const res = await fetch(`/api/admin/designers/${businessId}/portfolio/${itemId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update this item");
      toast.success("Portfolio item updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this item");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="outline" disabled={!!submitting || status === "APPROVED"} onClick={() => decide("APPROVED")}>
        {submitting === "APPROVED" ? "..." : "Approve"}
      </Button>
      <Button size="sm" variant="outline" className="text-danger hover:text-danger" disabled={!!submitting || status === "REJECTED"} onClick={() => decide("REJECTED")}>
        {submitting === "REJECTED" ? "..." : "Reject"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!submitting || status === "UPDATE_REQUESTED"} onClick={() => decide("UPDATE_REQUESTED")}>
        {submitting === "UPDATE_REQUESTED" ? "..." : "Request Update"}
      </Button>
    </div>
  );
}
