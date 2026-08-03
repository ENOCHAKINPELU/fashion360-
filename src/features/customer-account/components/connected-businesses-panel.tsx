"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { Users } from "lucide-react";

interface RelationshipItem {
  id: string;
  status: string;
  initiatedBy: string;
  business: { name: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  ACTIVE: "bg-success-soft text-success",
  DECLINED: "bg-danger-soft text-danger",
  INACTIVE: "bg-muted text-muted-foreground",
  BLOCKED: "bg-danger-soft text-danger",
};

// Part 17: the customer's own control over each business relationship —
// revoking here sets status INACTIVE, never deletes the relationship, so
// the history stays auditable. A PENDING row only gets Accept/Decline
// buttons when the *business* initiated it — a request the customer sent
// themselves just waits, mirroring the server-side gate in the PATCH route.
export function ConnectedBusinessesPanel({ relationships }: { relationships: RelationshipItem[] }) {
  const router = useRouter();

  async function respond(id: string, action: "accept" | "decline" | "revoke") {
    const res = await fetch(`/api/business-customer-relationships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.error ?? "Could not update this relationship");
      return;
    }
    toast.success(action === "accept" ? "Connected" : action === "decline" ? "Request declined" : "Access revoked");
    router.refresh();
  }

  if (relationships.length === 0) {
    return <EmptyState icon={Users} title="No Designers Yet" description="Businesses you work with will appear here." />;
  }

  return (
    <ul className="space-y-2">
      {relationships.map((rel) => (
        <li key={rel.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{rel.business.name}</span>
            <Badge className={STATUS_STYLES[rel.status] ?? STATUS_STYLES.PENDING}>{rel.status}</Badge>
          </div>
          {rel.status === "PENDING" && rel.initiatedBy === "BUSINESS" && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => respond(rel.id, "accept")}>
                Accept
              </Button>
              <Button variant="outline" size="sm" onClick={() => respond(rel.id, "decline")}>
                Decline
              </Button>
            </div>
          )}
          {rel.status === "PENDING" && rel.initiatedBy === "CUSTOMER" && (
            <span className="text-xs text-muted-foreground">Waiting for the business to respond</span>
          )}
          {rel.status === "ACTIVE" && (
            <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => respond(rel.id, "revoke")}>
              Revoke access
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
