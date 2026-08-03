"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { StarRating } from "@/shared/components/star-rating";
import { TrustBadgesRow } from "@/shared/components/trust-badges-row";
import { ReviewTrendChart } from "@/features/reviews/components/charts/review-trend-chart";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface ReviewRow {
  id: string;
  overallRating: number;
  bodyText: string;
  status: string;
  createdAt: string;
  customerProfile: { username: string | null; profilePhotoUrl: string | null };
  order: { orderCode: string };
  ratings: { category: string; rating: number }[];
  photos: { url: string }[];
  response: { body: string; createdAt: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  DESIGN_QUALITY: "Design Quality",
  COMMUNICATION: "Communication",
  PROFESSIONALISM: "Professionalism",
  DELIVERY_TIMELINESS: "Delivery Timeliness",
  VALUE_FOR_MONEY: "Value for Money",
  CUSTOMER_EXPERIENCE: "Customer Experience",
};

const REPORT_REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "FAKE_REVIEW", label: "Fake Review" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate Content" },
  { value: "PERSONAL_INFORMATION", label: "Personal Information" },
  { value: "FRAUD", label: "Fraud" },
  { value: "OTHER", label: "Other" },
];

export function BusinessReviewsPageClient({
  rating,
  rankingScore,
  badges,
  reviews,
  volumeTrend,
  ratingTrend,
}: {
  rating: { averageRating: number; totalReviews: number; verifiedReviewCount: number; recentReviewCount: number; categoryAverages: Record<string, number> | null } | null;
  rankingScore: number;
  badges: { type: string; label: string }[];
  reviews: ReviewRow[];
  volumeTrend: { label: string; value: number }[];
  ratingTrend: { label: string; value: number }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("all");

  const pendingResponse = useMemo(() => reviews.filter((r) => r.status === "PUBLISHED" && !r.response), [reviews]);
  const flagged = useMemo(() => reviews.filter((r) => r.status === "FLAGGED" || r.status === "PENDING_MODERATION"), [reviews]);
  const shown = tab === "pending" ? pendingResponse : tab === "flagged" ? flagged : reviews;

  const positiveCategories = rating?.categoryAverages ? Object.entries(rating.categoryAverages).filter(([, v]) => v >= 4) : [];
  const negativeCategories = rating?.categoryAverages ? Object.entries(rating.categoryAverages).filter(([, v]) => v < 3.5) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">Customer ratings, written reviews, and finished-outfit photos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase">Overall Rating</p>
            {rating && rating.totalReviews > 0 ? (
              <div className="mt-1">
                <StarRating value={rating.averageRating} size="md" showValue />
              </div>
            ) : (
              <p className="mt-1 text-lg font-semibold text-foreground">Not yet rated</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase">Total Reviews</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{rating?.totalReviews ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase">Verified Reviews</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{rating?.verifiedReviewCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase">Ranking Score</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{rankingScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Out of 100, reflects rating, reliability, and activity</p>
          </CardContent>
        </Card>
      </div>

      {badges.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Trust Badges</p>
            <TrustBadgesRow badges={badges} />
          </CardContent>
        </Card>
      )}

      {rating?.categoryAverages && Object.keys(rating.categoryAverages).length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Rating Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {Object.entries(rating.categoryAverages).map(([category, avg]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{CATEGORY_LABELS[category] ?? category}</span>
                <StarRating value={avg} showValue />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Review Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewTrendChart data={volumeTrend} />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Average Rating Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewTrendChart data={ratingTrend} domain={[0, 5]} formatValue={(v) => `${v}★`} />
          </CardContent>
        </Card>
      </div>

      {(positiveCategories.length > 0 || negativeCategories.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {positiveCategories.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-success">Positive Feedback</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {positiveCategories.map(([c, v]) => (
                  <Badge key={c} className="bg-success-soft text-success hover:bg-success-soft">
                    {CATEGORY_LABELS[c] ?? c} ({v.toFixed(1)}★)
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
          {negativeCategories.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-danger">Needs Attention</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {negativeCategories.map(([c, v]) => (
                  <Badge key={c} className="bg-danger-soft text-danger hover:bg-danger-soft">
                    {CATEGORY_LABELS[c] ?? c} ({v.toFixed(1)}★)
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Response ({pendingResponse.length})</TabsTrigger>
          <TabsTrigger value="flagged">Flagged ({flagged.length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {shown.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No Reviews Yet"
              description="Your customer reviews will appear here after completed orders."
              className="border-none py-12"
            />
          ) : (
            <div className="space-y-3">
              {shown.map((review) => (
                <ReviewCard key={review.id} review={review} onChanged={() => router.refresh()} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewCard({ review, onChanged }: { review: ReviewRow; onChanged: () => void }) {
  const [respondOpen, setRespondOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [body, setBody] = useState(review.response?.body ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function respond() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send response");
      toast.success("Response published");
      setRespondOpen(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{review.customerProfile.username ?? "Fashion360 Customer"}</span>
            <Badge variant="outline" className="text-xs">
              Verified Order
            </Badge>
            {review.status !== "PUBLISHED" && <Badge variant="outline">{review.status.replace(/_/g, " ")}</Badge>}
          </div>
          <StarRating value={review.overallRating} />
        </div>
        <p className="text-sm text-foreground">{review.bodyText}</p>
        {review.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {review.photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p.url} alt="" className="size-14 rounded-lg border border-border object-cover" />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {review.order.orderCode} · {formatRelativeTime(review.createdAt)}
        </p>

        {review.response && (
          <div className="rounded-xl border border-border bg-muted/50 p-3">
            <p className="text-xs font-medium text-foreground">Your response</p>
            <p className="mt-1 text-sm text-muted-foreground">{review.response.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.response.createdAt)}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => setRespondOpen(true)}>
            {review.response ? "Edit Response" : "Respond"}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setReportOpen(true)}>
            <Flag className="size-3.5" /> Report
          </Button>
        </div>
      </CardContent>

      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to review</DialogTitle>
          </DialogHeader>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Thank the customer or address their feedback..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={respond} disabled={submitting || !body.trim()}>
              {submitting ? "Publishing..." : "Publish Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportReviewDialog open={reportOpen} onOpenChange={setReportOpen} reviewId={review.id} onDone={onChanged} />
    </Card>
  );
}

function ReportReviewDialog({ open, onOpenChange, reviewId, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; reviewId: string; onDone: () => void }) {
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not report review");
      toast.success("Report submitted for admin review");
      onOpenChange(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not report review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report review</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add details (optional)" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
