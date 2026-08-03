"use client";

import Link from "next/link";
import { MapPin, ShieldCheck, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serviceCategoryOptions } from "@/lib/validations/service";
import { StarRating } from "@/shared/components/star-rating";
import { TrustBadgesRow } from "@/shared/components/trust-badges-row";

const CATEGORY_LABELS = Object.fromEntries(serviceCategoryOptions.map((o) => [o.value, o.label]));

export interface DiscoverBusiness {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  profile: { username: string | null; description: string | null } | null;
  specialties: { id: string; name: string }[];
  portfolioItems: { imageUrl: string }[];
  verification: { status: string } | null;
  services: { category: string }[];
  rating?: { averageRating: number; totalReviews: number; verifiedReviewCount: number } | null;
  trustBadgeAssignments?: { trustBadge: { type: string; label: string } }[];
}

export function BusinessCard({
  business,
  isFavorited,
  onToggleFavorite,
}: {
  business: DiscoverBusiness;
  isFavorited: boolean;
  onToggleFavorite: (next: boolean) => void;
}) {
  const location = [business.city, business.state].filter(Boolean).join(", ");
  const handle = business.profile?.username ?? business.id;
  const isVerified = business.verification?.status === "VERIFIED";
  const categories = Array.from(new Set(business.services.map((s) => s.category))).slice(0, 3);

  return (
    <Card className="group overflow-hidden border-none shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        <div className="grid grid-cols-3 gap-0.5 bg-muted">
          {(business.portfolioItems.length > 0 ? business.portfolioItems : [null, null, null]).slice(0, 3).map((item, i) => (
            <div key={i} className="aspect-square overflow-hidden bg-muted">
              {item ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="size-full object-cover" />
              ) : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(!isFavorited)}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-colors hover:bg-white"
        >
          <Heart className={isFavorited ? "size-4 fill-danger text-danger" : "size-4"} />
        </button>
      </div>

      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt={business.name} className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-border" />
          ) : (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-primary">
              {business.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">{business.name}</p>
              {isVerified && <ShieldCheck className="size-3.5 shrink-0 text-primary" />}
            </div>
            {location ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" /> {location}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Location not set</p>
            )}
          </div>
        </div>

        {business.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {business.specialties.slice(0, 3).map((s) => (
              <Badge key={s.id} variant="outline" className="text-xs">
                {s.name}
              </Badge>
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <p className="text-xs text-muted-foreground">{categories.map((c) => CATEGORY_LABELS[c] ?? c).join(" · ")}</p>
        )}

        {business.trustBadgeAssignments && business.trustBadgeAssignments.length > 0 && (
          <TrustBadgesRow badges={business.trustBadgeAssignments.slice(0, 2).map((a) => a.trustBadge)} />
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          {business.rating && business.rating.totalReviews > 0 ? (
            <span className="flex items-center gap-1.5">
              <StarRating value={business.rating.averageRating} />
              <span>({business.rating.totalReviews})</span>
            </span>
          ) : (
            <span>No reviews yet</span>
          )}
          <span>{isVerified ? "Verified" : "Not yet verified"}</span>
        </div>

        <Button asChild size="sm" className="w-full">
          <Link href={`/business/${handle}`}>View Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
