"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { StarRating } from "@/shared/components/star-rating";
import { ReviewFormDialog } from "@/features/reviews/components/review-form-dialog";
import { formatDate } from "@/lib/utils";

interface ReviewableOrder {
  id: string;
  orderCode: string;
  business: { id: string; name: string; logoUrl: string | null };
}

interface ReviewRow {
  id: string;
  overallRating: number;
  bodyText: string;
  status: string;
  createdAt: string;
  editedAt: string | null;
  business: { id: string; name: string; logoUrl: string | null };
  order: { id: string; orderCode: string };
  ratings: { category: string; rating: number }[];
  photos: { url: string; isPublic: boolean }[];
  response: { body: string; createdAt: string } | null;
  canEdit: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_MODERATION: "Pending Review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  FLAGGED: "Under Review",
  HIDDEN: "Hidden",
  REMOVED: "Removed",
};
const STATUS_STYLES: Record<string, string> = {
  PENDING_MODERATION: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  FLAGGED: "bg-warning-soft text-warning",
  HIDDEN: "bg-muted text-muted-foreground",
  REMOVED: "bg-danger-soft text-danger",
};

export function CustomerReviewsPageClient({ reviewableOrders, reviews }: { reviewableOrders: ReviewableOrder[]; reviews: ReviewRow[] }) {
  const router = useRouter();
  const [reviewTarget, setReviewTarget] = useState<ReviewableOrder | null>(null);
  const [editTarget, setEditTarget] = useState<ReviewRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function requestDeletion(reviewId: string) {
    setDeletingId(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/request`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not request deletion");
      toast.success("Deletion requested, an admin will review it");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request deletion");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Reviews</h1>
        <p className="text-sm text-muted-foreground">Rate and review the businesses you&apos;ve worked with.</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Orders to Review</h2>
        {reviewableOrders.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No Completed Orders to Review"
            description="Complete your first order to share your experience."
            className="border-none py-10"
          />
        ) : (
          <div className="space-y-2">
            {reviewableOrders.map((order) => (
              <Card key={order.id} className="border-none shadow-sm">
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.business.name}</p>
                    <p className="text-xs text-muted-foreground">{order.orderCode}</p>
                  </div>
                  <Button size="sm" onClick={() => setReviewTarget(order)}>
                    Leave a Review
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Your Reviews</h2>
        {reviews.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews you submit will appear here." className="border-none py-10" />
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const canEdit = review.canEdit;
              return (
                <Card key={review.id} className="border-none shadow-sm">
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{review.business.name}</p>
                        <p className="text-xs text-muted-foreground">{review.order.orderCode}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating value={review.overallRating} />
                        <Badge className={STATUS_STYLES[review.status] ?? STATUS_STYLES.PENDING_MODERATION}>{STATUS_LABELS[review.status] ?? review.status}</Badge>
                      </div>
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
                      {formatDate(review.createdAt)}
                      {review.editedAt ? " · Edited" : ""}
                    </p>
                    {review.response && (
                      <div className="rounded-xl border border-border bg-muted/50 p-3">
                        <p className="text-xs font-medium text-foreground">Response from {review.business.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{review.response.body}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => setEditTarget(review)}>
                          Edit
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-danger" disabled={deletingId === review.id} onClick={() => requestDeletion(review.id)}>
                        {deletingId === review.id ? "Requesting..." : "Request Deletion"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {reviewTarget && (
        <ReviewFormDialog
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
          orderId={reviewTarget.id}
          businessName={reviewTarget.business.name}
          onDone={() => {
            setReviewTarget(null);
            router.refresh();
          }}
        />
      )}

      {editTarget && (
        <ReviewFormDialog
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          orderId={editTarget.order.id}
          businessName={editTarget.business.name}
          existingReview={editTarget}
          onDone={() => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
