"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, ThumbsDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/shared/components/star-rating";
import { TrustBadgesRow } from "@/shared/components/trust-badges-row";

interface DesignerRec {
  id: string;
  reasonText: string;
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    rating?: { averageRating: number; totalReviews: number } | null;
    trustBadgeAssignments?: { trustBadge: { type: string; label: string } }[];
  } | null;
}

export function DesignerRecommendationCard({ recommendation, onDismissed }: { recommendation: DesignerRec; onDismissed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const business = recommendation.business;
  if (!business || dismissed) return null;

  async function act(action: "save" | "not-interested") {
    setBusy(true);
    try {
      if (action === "save") {
        await fetch(`/api/recommendations/${recommendation.id}/save`, { method: "POST" });
        toast.success("Following this designer");
      } else {
        await fetch(`/api/recommendations/${recommendation.id}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        setDismissed(true);
        onDismissed();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-2 p-3">
        <Link
          href={`/business/${business.id}`}
          className="flex items-center gap-3"
          onClick={() => fetch(`/api/recommendations/${recommendation.id}/click`, { method: "POST" }).catch(() => {})}
        >
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt={business.name} className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-border" />
          ) : (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-primary">{business.name.charAt(0)}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{business.name}</p>
            {business.rating && business.rating.totalReviews > 0 ? (
              <StarRating value={business.rating.averageRating} />
            ) : (
              <p className="text-xs text-muted-foreground">New on Fashion360</p>
            )}
          </div>
        </Link>
        {business.trustBadgeAssignments && business.trustBadgeAssignments.length > 0 && <TrustBadgesRow badges={business.trustBadgeAssignments.slice(0, 2).map((a) => a.trustBadge)} />}
        <p className="flex items-center gap-1 text-xs text-primary">
          <Sparkles className="size-3 shrink-0" /> {recommendation.reasonText}
        </p>
        <div className="flex gap-1 pt-1">
          <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => act("save")}>
            <Heart className="size-3.5" /> Follow
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={busy} onClick={() => act("not-interested")} aria-label="Not interested">
            <ThumbsDown className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
