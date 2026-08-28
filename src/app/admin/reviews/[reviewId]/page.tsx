import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Shirt, ShoppingBag, Star, Flag, History, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminReviewActions } from "@/features/admin/components/admin-review-actions";
import { getAdminReviewDetail } from "@/lib/admin-reviews";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  PENDING_MODERATION: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  FLAGGED: "bg-warning-soft text-warning",
  HIDDEN: "bg-muted text-muted-foreground",
  REMOVED: "bg-muted text-muted-foreground",
};

const REPORT_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  DISMISSED: "bg-muted text-muted-foreground",
  ACTIONED: "bg-success-soft text-success",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`size-4 ${i < rating ? "fill-warning text-warning" : "text-border"}`} />
      ))}
    </span>
  );
}

// Admin Phase 9 review detail — didn't exist before this phase; every
// moderation action here reuses the pre-existing moderateReview backend
// (lib/reviews.ts) through the pre-existing moderate/restore routes.
export default async function AdminReviewDetailPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const review = await getAdminReviewDetail(reviewId);
  if (!review) notFound();

  const customerName = review.customerProfile.user.name ?? review.customerProfile.user.email;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/reviews" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Reviews
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground">{review.id.slice(0, 14)}…</h1>
              <Badge className={STATUS_BADGE[review.status] ?? "bg-muted text-muted-foreground"}>{review.status.replace(/_/g, " ")}</Badge>
              <Stars rating={review.overallRating} />
            </div>
            <p className="text-sm text-muted-foreground">
              {customerName} → {review.business.name} · Order{" "}
              <Link href={`/admin/orders/${review.order.id}`} className="text-primary hover:underline">
                {review.order.orderCode}
              </Link>
            </p>
          </div>
          <AdminReviewActions reviewId={review.id} status={review.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Written Review */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" /> Written Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{review.bodyText}</p>
              <p className="text-xs text-muted-foreground">
                Submitted {formatDate(review.createdAt)}
                {review.editCount > 0 && ` · edited ${review.editCount}×`}
              </p>
              {review.ratings.length > 0 && (
                <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-3">
                  {review.ratings.map((r) => (
                    <div key={r.id}>
                      <dt className="text-xs text-muted-foreground">{r.category.replace(/_/g, " ")}</dt>
                      <dd className="text-sm text-foreground">{r.rating} / 5</dd>
                    </div>
                  ))}
                </dl>
              )}
              {review.photos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Images</p>
                  <div className="flex flex-wrap gap-2">
                    {review.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.url} alt="" className="size-20 rounded-lg border border-border object-cover" />
                    ))}
                  </div>
                </div>
              )}
              {review.response && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-muted-foreground">Designer&apos;s Response</p>
                  <p className="mt-1 text-sm text-foreground">{review.response.body}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <User className="size-4" /> Customer
                </span>
                <Link href={`/admin/customers/${review.customerProfile.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Name</dt>
                  <dd className="text-foreground">{customerName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Verified Purchase</dt>
                  <dd className="text-foreground">{review.isVerifiedPurchase ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Designer */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Shirt className="size-4" /> Designer
                </span>
                <Link href={`/admin/businesses/${review.business.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Business</dt>
                  <dd className="text-foreground">{review.business.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Order Value</dt>
                  <dd className="text-foreground">{review.orderValueSnapshot}</dd>
                </div>
              </dl>
              <Link href={`/admin/orders/${review.order.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ShoppingBag className="size-3" /> View full order
              </Link>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flag className="size-4" /> Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {review.reports.length === 0 ? (
                <EmptyState icon={Flag} title="No reports on this review" className="border-none py-8" />
              ) : (
                <div className="space-y-2">
                  {review.reports.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline">{r.reason.replace(/_/g, " ")}</Badge>
                        <Badge className={REPORT_STATUS_BADGE[r.status] ?? "bg-muted text-muted-foreground"}>{r.status}</Badge>
                      </div>
                      {r.details && <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.reporterType} · {formatRelativeTime(r.createdAt)}
                        {r.resolvedBy?.name ? ` · resolved by ${r.resolvedBy.name}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Moderation History */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Moderation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {review.moderationActions.length === 0 ? (
                <EmptyState icon={History} title="No moderation actions yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-3">
                  {review.moderationActions.map((m) => (
                    <li key={m.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm text-foreground">{m.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{m.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.actor?.name ?? "System"} · {formatRelativeTime(m.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {review.flagReasons.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Automatic Flag Reasons</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {review.flagReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
