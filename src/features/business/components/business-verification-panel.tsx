"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/shared/components/image-upload";

interface VerificationState {
  status: string;
  submissionNote: string | null;
  documentUrl: string | null;
  notes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

// The trust badge (BusinessTrustProfileCard) has always displayed
// verification status; this is the part that was missing — an actual way
// to request it. Evidence upload reuses the existing image upload pipeline
// rather than adding a new document-upload path, so a business registration
// certificate/ID photo works the same as any other upload here.
export function BusinessVerificationPanel({ initial }: { initial: VerificationState | null }) {
  const router = useRouter();
  const [verification, setVerification] = useState(initial);
  const [note, setNote] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!note.trim()) {
      toast.error("Tell us a bit about your business first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionNote: note.trim(), documentUrl: documentUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit for verification");
      toast.success("Verification request submitted");
      setVerification(data.verification);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit for verification");
    } finally {
      setSubmitting(false);
    }
  }

  if (verification?.status === "VERIFIED") {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Your business is verified</p>
            <p className="text-xs text-muted-foreground">The Verified badge is live on your public profile.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verification?.status === "PENDING") {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Verification request pending review</p>
            <p className="text-xs text-muted-foreground">Submitted {verification.submittedAt ? new Date(verification.submittedAt).toLocaleDateString() : ""} — you&apos;ll be notified once it&apos;s reviewed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Request Verification</p>
          <p className="text-xs text-muted-foreground">
            Verified businesses get a trust badge on their public profile and rank higher in discovery. An admin reviews every request.
          </p>
        </div>

        {verification?.status === "REJECTED" && verification.notes && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" />
            <div>
              <p className="font-medium text-danger">Your last request was declined</p>
              <p className="mt-0.5 text-muted-foreground">{verification.notes}</p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Tell us about your business</Label>
          <Textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How long you've been operating, registration details, notable work..."
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Supporting document (optional)</Label>
          <ImageUpload value={documentUrl} onChange={setDocumentUrl} folder="verification-documents" label="Upload registration certificate or ID" />
        </div>

        <Button onClick={submit} disabled={submitting || !note.trim()}>
          {submitting ? "Submitting..." : "Submit for Verification"}
        </Button>
      </CardContent>
    </Card>
  );
}
