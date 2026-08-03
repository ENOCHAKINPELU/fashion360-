"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Landmark, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface PayoutRecipientData {
  legalName: string;
  businessName: string | null;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string | null;
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
}

const KYC_BADGE: Record<PayoutRecipientData["kycStatus"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  NOT_SUBMITTED: { label: "Not Submitted", className: "bg-muted text-muted-foreground", icon: Clock },
  PENDING: { label: "Pending Review", className: "bg-warning-soft text-warning", icon: Clock },
  VERIFIED: { label: "Verified", className: "bg-success-soft text-success", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", className: "bg-danger-soft text-danger", icon: XCircle },
};

export function PayoutAccountSettings({ recipient }: { recipient: PayoutRecipientData | null }) {
  const router = useRouter();
  const [legalName, setLegalName] = useState(recipient?.legalName ?? "");
  const [businessName, setBusinessName] = useState(recipient?.businessName ?? "");
  const [bankName, setBankName] = useState(recipient?.bankName ?? "");
  const [bankCode, setBankCode] = useState(recipient?.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(recipient?.accountNumber ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/payout-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalName, businessName: businessName || undefined, bankName, bankCode, accountNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save payout account");
      if (data.accountNameResolved) toast.success(`Verified: ${data.recipient.accountName}`);
      else toast.warning(data.message ?? "Saved, account name could not be auto-verified, double-check the number.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save payout account");
    } finally {
      setSaving(false);
    }
  }

  const status = KYC_BADGE[recipient?.kycStatus ?? "NOT_SUBMITTED"];
  const StatusIcon = status.icon;

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Payout Account</p>
            <p className="text-xs text-muted-foreground">Where your payouts are recorded as destined for. No card details, ever.</p>
          </div>
          <Badge className={status.className}>
            <StatusIcon className="mr-1 size-3" /> {status.label}
          </Badge>
        </div>

        {recipient?.accountName && (
          <div className="rounded-xl border border-success/20 bg-success-soft p-3 text-xs text-success">
            Account name on file: <span className="font-medium">{recipient.accountName}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Legal Name</Label>
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Full legal name" />
          </div>
          <div className="space-y-1.5">
            <Label>Business Name (optional)</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Registered business name" />
          </div>
          <div className="space-y-1.5">
            <Label>Bank Name</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Guaranty Trust Bank" />
          </div>
          <div className="space-y-1.5">
            <Label>Bank Code</Label>
            <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="CBN bank code, e.g. 058" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Account Number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="10-digit NUBAN" />
          </div>
        </div>

        <Button
          onClick={save}
          disabled={saving || !legalName || !bankName || !bankCode || !accountNumber}
          className="gap-1.5"
        >
          <Landmark className="size-4" /> {saving ? "Saving..." : "Save Payout Account"}
        </Button>
      </CardContent>
    </Card>
  );
}
