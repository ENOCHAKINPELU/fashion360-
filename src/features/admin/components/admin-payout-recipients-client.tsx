"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecipientRow {
  id: string;
  legalName: string;
  bankName: string;
  accountNumber: string;
  accountName: string | null;
  business: { id: string; name: string };
}

export function AdminPayoutRecipientsClient({ recipients }: { recipients: RecipientRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(businessId: string, status: "VERIFIED" | "REJECTED") {
    setBusyId(businessId);
    try {
      const res = await fetch(`/api/admin/payout-recipients/${businessId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update payout account");
      toast.success(`Payout account ${status.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payout account");
    } finally {
      setBusyId(null);
    }
  }

  if (recipients.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Payout Accounts Pending Verification</p>
      {recipients.map((r) => (
        <Card key={r.id} className="border-none shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{r.business.name}</p>
              <p className="text-xs text-muted-foreground">
                {r.legalName} · {r.bankName} · {r.accountNumber} {r.accountName ? `(${r.accountName})` : "(name not auto-verified)"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => decide(r.business.id, "VERIFIED")} disabled={busyId === r.business.id}>
                Verify
              </Button>
              <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => decide(r.business.id, "REJECTED")} disabled={busyId === r.business.id}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
