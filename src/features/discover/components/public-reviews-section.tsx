"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating } from "@/shared/components/star-rating";
import { TrustBadgesRow } from "@/shared/components/trust-badges-row";
import { EmptyState } from "@/shared/components/empty-state";
import { MessageSquare } from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { getReviewHighlights } from "@/lib/review-highlights";

interface ReviewRow {
  id: string;
  overallRating: number;
  bodyText: string;
  createdAt: string;
  editedAt: string | null;
  customerProfile: { username: string | null; profilePhotoUrl: string | null };
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

export function PublicReviewsSection({
  businessId,
  rating,
  badges,
}: {
  businessId: string;
  rating: { averageRating: number; totalReviews: number; verifiedReviewCount: number; categoryAverages: Record<string, number> | null };
  badges: { type: string; label: string }[];
}) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sort, setSort] = useState("recent");
  const hasLoadedRef = useRef(false);

  async function load(nextSort: string) {
    const res = await fetch(`/api/businesses/${businessId}/reviews?sort=${nextSort}`);
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      load(sort);
      return;
    }
    load(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const highlights = getReviewHighlights(rating.categoryAverages);
  const publicPhotos = reviews.flatMap((r) => r.photos);

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Reviews</p>
            {rating.totalReviews === 0 ? (
              <p className="mt-1 text-lg font-semibold text-foreground">New on Fashion360</p>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <StarRating value={rating.averageRating} size="md" showValue />
                <span className="text-sm text-muted-foreground">
                  Based on {rating.verifiedReviewCount} verified customer review{rating.verifiedReviewCount === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
          {reviews.length > 0 && (
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="highest">Highest Rated</SelectItem>
                <SelectItem value="lowest">Lowest Rated</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TrustBadgesRow badges={badges} />

        {rating.categoryAverages && Object.keys(rating.categoryAverages).length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-3">
            {Object.entries(rating.categoryAverages).map(([category, avg]) => (
              <div key={category} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{CATEGORY_LABELS[category] ?? category}</span>
                <span className="font-medium text-foreground">{avg.toFixed(1)}★</span>
              </div>
            ))}
          </div>
        )}

        {highlights.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Customers frequently mention</p>
            <div className="flex flex-wrap gap-1.5">
              {highlights.map((h) => (
                <Badge key={h} variant="outline">
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {publicPhotos.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Customer Photos</p>
            <div className="flex flex-wrap gap-2">
              {publicPhotos.slice(0, 8).map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.url} alt="" className="size-16 rounded-lg border border-border object-cover" />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 border-t border-border pt-4">
          {!loaded ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews from verified customers will appear here." className="border-none py-8" />
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="space-y-2 border-b border-border pb-4 last:border-none last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{review.customerProfile.username ?? "Fashion360 Customer"}</span>
                    <Badge variant="outline" className="text-xs">
                      Verified Order
                    </Badge>
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
                  {formatRelativeTime(review.createdAt)}
                  {review.editedAt ? " · Edited" : ""}
                </p>
                {review.response && (
                  <div className="ml-4 rounded-xl border border-border bg-muted/50 p-3">
                    <p className="text-xs font-medium text-foreground">Response from the business</p>
                    <p className="mt-1 text-sm text-muted-foreground">{review.response.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.response.createdAt)}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
