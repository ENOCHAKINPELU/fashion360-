"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Fires once on mount to flip SUBMITTED -> RECEIVED (Part 18's "Business
// Viewed" timeline event) — idempotent server-side, so remounts/refreshes
// never double-record it.
export function ServiceRequestMarkViewed({ requestId, alreadyViewed }: { requestId: string; alreadyViewed: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (alreadyViewed) return;
    fetch(`/api/business/service-requests/${requestId}/view`, { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, alreadyViewed]);

  return null;
}
