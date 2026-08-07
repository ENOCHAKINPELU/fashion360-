"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Flag, Trash2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

interface FlaggedReview {
  id: string;
  bodyText: string | null;
  overallRating: number;
  status: string;
  createdAt: string;
  business: { id: string; name: string };
  customerProfile: { id: string; username: string | null } | null;
  reports: { id: string; reason: string; details: string | null }[];
}

interface ReviewReport {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  review: { id: string; bodyText: string | null; overallRating: number; status: string; businessId: string };
}

interface DeletionRequest {
  id: string;
  requestedAt: string;
  review: { id: string; bodyText: string | null; overallRating: number; businessId: string; createdAt: string };
}

const MODERATE_ACTIONS = [
  { value: "APPROVE", label: "Approve — publish as-is" },
  { value: "REJECT", label: "Reject — never publish" },
  { value: "HIDE", label: "Hide — remove from public view" },
  { value: "RESTORE", label: "Restore — make visible again" },
  { value: "SUSPEND_PRIVILEGES", label: "Suspend reviewer's review privileges" },
] as const;

function RatingStars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-warning">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="size-3.5" fill={i < value ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export function AdminReviewModerationClient({
  flaggedReviews,
  reports,
  deletionRequests,
}: {
  flaggedReviews: FlaggedReview[];
  reports: ReviewReport[];
  deletionRequests: DeletionRequest[];
}) {
  const router = useRouter();

  return (
    <Tabs defaultValue="flagged">
      <div className="overflow-x-auto scrollbar-thin">
        <TabsList>
          <TabsTrigger value="flagged">Flagged &amp; Pending ({flaggedReviews.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="deletions">Deletion Requests ({deletionRequests.length})</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="flagged" className="space-y-3">
        {flaggedReviews.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Nothing needs moderation" description="Flagged and pending reviews will appear here." />
        ) : (
          flaggedReviews.map((review) => <ModerateReviewCard key={review.id} review={review} onDone={() => router.refresh()} />)
        )}
      </TabsContent>

      <TabsContent value="reports" className="space-y-3">
        {reports.length === 0 ? (
          <EmptyState icon={Flag} title="No open reports" description="Customer or business reports about a review will appear here." />
        ) : (
          reports.map((report) => <ReportCard key={report.id} report={report} onDone={() => router.refresh()} />)
        )}
      </TabsContent>

      <TabsContent value="deletions" className="space-y-3">
        {deletionRequests.length === 0 ? (
          <EmptyState icon={Trash2} title="No pending deletion requests" description="A business's request to delete a review will appear here." />
        ) : (
          deletionRequests.map((req) => <DeletionRequestCard key={req.id} request={req} onDone={() => router.refresh()} />)
        )}
      </TabsContent>
    </Tabs>
  );
}

function ModerateReviewCard({ review, onDone }: { review: FlaggedReview; onDone: () => void }) {
  const [action, setAction] = useState<(typeof MODERATE_ACTIONS)[number]["value"]>("APPROVE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      toast.error("A reason is required for moderation actions");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not moderate this review");
      toast.success("Review moderated");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not moderate this review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{review.business.name}</span>
            <RatingStars value={review.overallRating} />
            <Badge variant="outline">{review.status.replace(/_/g, " ")}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(review.createdAt)}</span>
        </div>
        {review.bodyText && <p className="text-sm text-muted-foreground">&ldquo;{review.bodyText}&rdquo;</p>}
        {review.reports.length > 0 && (
          <div className="rounded-lg bg-danger-soft p-2.5 text-xs text-danger">
            {review.reports.length} report{review.reports.length > 1 ? "s" : ""}:{" "}
            {review.reports.map((r) => r.reason.replace(/_/g, " ").toLowerCase()).join(", ")}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODERATE_ACTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (required)" />
          </div>
          <Button onClick={submit} disabled={submitting} size="sm">
            {submitting ? "Submitting..." : "Apply"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportCard({ report, onDone }: { report: ReviewReport; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function resolve(status: "DISMISSED" | "ACTIONED") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/review-reports/${report.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNote: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resolve this report");
      toast.success(status === "DISMISSED" ? "Report dismissed" : "Report actioned");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve this report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className="bg-danger-soft text-danger">{report.reason.replace(/_/g, " ")}</Badge>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(report.createdAt)}</span>
        </div>
        {report.details && <p className="text-sm text-muted-foreground">Reporter note: &ldquo;{report.details}&rdquo;</p>}
        <div className="rounded-lg border border-border bg-surface p-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Review being reported <RatingStars value={report.review.overallRating} />
          </span>
          {report.review.bodyText && <p className="mt-1 text-foreground">&ldquo;{report.review.bodyText}&rdquo;</p>}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Resolution note (optional)" />
          <Button variant="outline" size="sm" disabled={submitting} onClick={() => resolve("DISMISSED")}>Dismiss</Button>
          <Button size="sm" disabled={submitting} onClick={() => resolve("ACTIONED")}>Action It</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeletionRequestCard({ request, onDone }: { request: DeletionRequest; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function resolve(approve: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/review-deletion-requests/${request.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, resolutionNote: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resolve this request");
      toast.success(approve ? "Deletion approved" : "Deletion denied");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve this request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <RatingStars value={request.review.overallRating} />
          </span>
          <span className="text-xs text-muted-foreground">Requested {formatRelativeTime(request.requestedAt)}</span>
        </div>
        {request.review.bodyText && <p className="text-sm text-muted-foreground">&ldquo;{request.review.bodyText}&rdquo;</p>}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Resolution note (optional)" />
          <Button variant="outline" size="sm" disabled={submitting} onClick={() => resolve(false)}>Deny</Button>
          <Button variant="destructive" size="sm" disabled={submitting} onClick={() => resolve(true)}>Approve Deletion</Button>
        </div>
      </CardContent>
    </Card>
  );
}
