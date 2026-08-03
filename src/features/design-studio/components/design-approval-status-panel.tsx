"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesignPreviewStatusBadge } from "@/features/design-studio/components/design-preview-status-badge";
import { formatDate, cn } from "@/lib/utils";
import type { DesignRevisionRequestData, DesignApprovalData } from "@/features/design-studio/types";

const REVISION_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-warning-soft text-warning",
  IN_PROGRESS: "bg-info-soft text-info",
  ADDRESSED: "bg-success-soft text-success",
  DECLINED: "bg-muted text-muted-foreground",
};

export function DesignApprovalStatusPanel({
  previewId,
  status,
  revisionRequests,
  approvals,
}: {
  previewId: string;
  status: string;
  revisionRequests: DesignRevisionRequestData[];
  approvals: DesignApprovalData[];
}) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateRequest(requestId: string, nextStatus: "ADDRESSED" | "DECLINED") {
    setUpdatingId(requestId);
    try {
      const res = await fetch(`/api/design-previews/${previewId}/revision-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update revision request");
      toast.success(nextStatus === "ADDRESSED" ? "Marked as addressed" : "Marked as declined");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update revision request");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Current status</span>
        <DesignPreviewStatusBadge status={status} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Revision Requests</p>
        {revisionRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No revision requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {revisionRequests.map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground">{r.body}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      REVISION_STATUS_STYLES[r.status] ?? REVISION_STATUS_STYLES.OPEN
                    )}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                {(r.status === "OPEN" || r.status === "IN_PROGRESS") && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === r.id}
                      onClick={() => updateRequest(r.id, "ADDRESSED")}
                      className="gap-1.5"
                    >
                      <Check className="size-3.5" /> Addressed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === r.id}
                      onClick={() => updateRequest(r.id, "DECLINED")}
                      className="gap-1.5 text-danger hover:text-danger"
                    >
                      <X className="size-3.5" /> Decline
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Approval History</p>
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {approvals.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <span className={cn("font-medium", a.decision === "APPROVED" ? "text-success" : "text-danger")}>
                  {a.decision === "APPROVED" ? "Approved" : "Rejected"}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(a.decidedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
