"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldCheck, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface PendingVerification {
  id: string;
  submissionNote: string | null;
  documentUrl: string | null;
  submittedAt: string | null;
  business: { id: string; name: string; email: string | null; phone: string | null; businessType: string; createdAt: string };
}

export function AdminVerificationsClient({ verifications }: { verifications: PendingVerification[] }) {
  if (verifications.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No pending verification requests" description="Businesses that request verification will appear here." />;
  }

  return (
    <div className="space-y-3">
      {verifications.map((v) => (
        <VerificationCard key={v.id} verification={v} />
      ))}
    </div>
  );
}

function VerificationCard({ verification }: { verification: PendingVerification }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision: "VERIFIED" | "REJECTED") {
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Explain why, so the business knows what to fix");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verifications/${verification.business.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record this decision");
      toast.success(decision === "VERIFIED" ? "Business verified" : "Request declined");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record this decision");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link href={`/dashboard/customers`} className="text-sm font-medium text-foreground hover:underline">
              {verification.business.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {verification.business.businessType.replace(/_/g, " ")} · Joined {formatDate(verification.business.createdAt)}
              {verification.submittedAt && ` · Requested ${formatRelativeTime(verification.submittedAt)}`}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {verification.business.email ?? "No email"} {verification.business.phone && `· ${verification.business.phone}`}
          </div>
        </div>

        {verification.submissionNote && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">{verification.submissionNote}</p>
        )}

        {verification.documentUrl && (
          <a
            href={verification.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <FileText className="size-3.5" /> View submitted document
          </a>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (required if declining)" />
          <Button variant="outline" size="sm" disabled={submitting} onClick={() => decide("REJECTED")}>
            Decline
          </Button>
          <Button size="sm" disabled={submitting} onClick={() => decide("VERIFIED")}>
            Verify
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
