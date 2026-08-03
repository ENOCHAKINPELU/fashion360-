"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

interface RequestItem {
  id: string;
  requestedAt: string;
  customerProfile: { user: { name: string | null; email: string; image: string | null } };
}

// Part 19's "Customer Requests" card: platform customers who've asked to
// connect (Part 16), waiting on this business to accept or decline.
export function CustomerRequestsPanel({ requests }: { requests: RequestItem[] }) {
  const router = useRouter();

  async function respond(id: string, action: "accept" | "decline") {
    const res = await fetch(`/api/business-customer-relationships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.error ?? "Could not update this request");
      return;
    }
    toast.success(action === "accept" ? "Customer connected" : "Request declined");
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No Connection Requests"
        description="When a customer on Fashion360 asks to connect with you, their request will appear here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {requests.map((req) => (
        <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
          <div>
            <p className="font-medium text-foreground">{req.customerProfile.user.name ?? req.customerProfile.user.email}</p>
            <p className="text-xs text-muted-foreground">Requested {formatDate(req.requestedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => respond(req.id, "accept")}>
              Accept
            </Button>
            <Button variant="outline" size="sm" onClick={() => respond(req.id, "decline")}>
              Decline
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
