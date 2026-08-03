"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRatingInput } from "@/shared/components/star-rating";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { reviewCategoryOptions, REVIEW_BODY_MIN, REVIEW_BODY_MAX } from "@/lib/validations/review";

interface ExistingReview {
  id: string;
  overallRating: number;
  bodyText: string;
  ratings: { category: string; rating: number }[];
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  orderId,
  businessName,
  existingReview,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  businessName: string;
  existingReview?: ExistingReview | null;
  onDone: () => void;
}) {
  const [overallRating, setOverallRating] = useState(existingReview?.overallRating ?? 0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>(
    Object.fromEntries((existingReview?.ratings ?? []).map((r) => [r.category, r.rating]))
  );
  const [bodyText, setBodyText] = useState(existingReview?.bodyText ?? "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosPublic, setPhotosPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!existingReview;

  async function submit() {
    if (overallRating === 0) {
      toast.error("Please choose an overall rating");
      return;
    }
    if (bodyText.trim().length < REVIEW_BODY_MIN) {
      toast.error(`Please write at least ${REVIEW_BODY_MIN} characters`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        overallRating,
        bodyText: bodyText.trim(),
        categoryRatings: Object.entries(categoryRatings).map(([category, rating]) => ({ category, rating })),
        photos: photos.map((url) => ({ url, isPublic: photosPublic })),
      };
      const url = isEdit ? `/api/reviews/${existingReview!.id}` : `/api/customer/orders/${orderId}/reviews`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit review");
      toast.success(isEdit ? "Review updated" : "Thanks for your review!");
      onOpenChange(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit your review" : `Review ${businessName}`}</DialogTitle>
          <DialogDescription>Tell other customers about your experience working with this designer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Overall Rating</Label>
            <StarRatingInput value={overallRating} onChange={setOverallRating} />
          </div>

          <div className="space-y-2">
            <Label>Rate specific aspects (optional)</Label>
            <div className="space-y-2">
              {reviewCategoryOptions.map((cat) => (
                <div key={cat.value} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{cat.label}</span>
                  <StarRatingInput
                    size="sm"
                    value={categoryRatings[cat.value] ?? 0}
                    onChange={(v) => setCategoryRatings((prev) => ({ ...prev, [cat.value]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Your Review</Label>
            <Textarea
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Tell other customers about your experience working with this designer."
              maxLength={REVIEW_BODY_MAX}
            />
            <p className="text-right text-xs text-muted-foreground">
              {bodyText.trim().length}/{REVIEW_BODY_MAX} (min {REVIEW_BODY_MIN})
            </p>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>Photos of your finished outfit (optional)</Label>
              <MultiImageUpload value={photos} onChange={setPhotos} folder="review-photos" label="Add photos" />
              {photos.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={photosPublic} onCheckedChange={(v) => setPhotosPublic(v === true)} />
                  Show these photos publicly on the designer&apos;s profile
                </label>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : isEdit ? "Save Changes" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
