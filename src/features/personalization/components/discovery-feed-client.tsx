"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, MapPin, TrendingUp, Star, Clock, Heart, Shirt, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/shared/components/star-rating";
import { DesignRecommendationCard } from "@/features/personalization/components/design-recommendation-card";
import { DesignerRecommendationCard } from "@/features/personalization/components/designer-recommendation-card";
import { OccasionPicker } from "@/features/personalization/components/occasion-picker";

interface DesignRecShape {
  id: string;
  reasonText: string;
  design: { id: string; name: string; mainImageUrl: string | null; basePrice?: number | null; business?: { name: string } | null; businessId?: string } | null;
}
interface DesignerRecShape {
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

interface FeedResponse {
  hasLocation: boolean;
  sections: {
    recommendedForYou: DesignRecShape[];
    designersYouMayLike: DesignerRecShape[];
    becauseYouSaved: { id: string; name: string; mainImageUrl: string | null }[];
    continueExploring: { id: string; name: string; mainImageUrl: string | null }[];
    trendingNearYou: { id: string; name: string; logoUrl: string | null; rating: { averageRating: number; totalReviews: number } | null }[];
    trendingDesigns: { id: string; name: string; mainImageUrl: string | null; business: { name: string } }[];
    trendingDesigners: { id: string; name: string; logoUrl: string | null; rating: { averageRating: number; totalReviews: number } | null }[];
    topRated: { id: string; name: string; logoUrl: string | null; rating: { averageRating: number; totalReviews: number } | null }[];
    recentlyAdded: { id: string; name: string; mainImageUrl: string | null }[];
    yourWardrobe: { id: string; garmentName: string; imageUrl: string | null }[];
    readyForAnother: { id: string; garmentName: string; imageUrl: string | null }[];
  };
}

function DesignStrip({ items }: { items: { id: string; name: string; mainImageUrl: string | null }[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((d) => (
        <Link key={d.id} href={`/account/designs/browse/${d.id}`} className="w-32 shrink-0">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">
            {d.mainImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.mainImageUrl} alt={d.name} className="size-full object-cover" />
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-foreground">{d.name}</p>
        </Link>
      ))}
    </div>
  );
}

function BusinessStrip({ items }: { items: { id: string; name: string; logoUrl: string | null; rating: { averageRating: number; totalReviews: number } | null }[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((b) => (
        <Link key={b.id} href={`/business/${b.id}`} className="w-28 shrink-0 text-center">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logoUrl} alt={b.name} className="mx-auto size-16 rounded-xl object-cover ring-1 ring-border" />
          ) : (
            <div className="mx-auto flex size-16 items-center justify-center rounded-xl bg-accent-soft text-lg font-semibold text-primary">{b.name.charAt(0)}</div>
          )}
          <p className="mt-1 truncate text-xs text-foreground">{b.name}</p>
          {b.rating && b.rating.totalReviews > 0 && (
            <div className="flex justify-center">
              <StarRating value={b.rating.averageRating} size="sm" />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Sparkles; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function DiscoveryFeedClient() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/customer/discovery-feed", { cache: "no-store" });
    const data = await res.json();
    setFeed(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!feed) return null;
  const s = feed.sections;
  const isEmpty = s.recommendedForYou.length === 0 && s.becauseYouSaved.length === 0 && s.trendingDesigns.length === 0 && s.topRated.length === 0;

  return (
    <div className="space-y-6">
      <OccasionPicker />

      {isEmpty && (
        <EmptyState icon={Compass} title="Explore a few designs and we'll personalize your feed" description="Browse the catalog, save what you like, and your recommendations will improve." className="border-none py-10" />
      )}

      {s.recommendedForYou.length > 0 && (
        <Section icon={Sparkles} title="Recommended For You">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {s.recommendedForYou.map((r) => (
              <DesignRecommendationCard key={r.id} recommendation={r} onDismissed={load} />
            ))}
          </div>
        </Section>
      )}

      {s.designersYouMayLike.length > 0 && (
        <Section icon={Heart} title="Designers You May Like">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.designersYouMayLike.map((r) => (
              <DesignerRecommendationCard key={r.id} recommendation={r} onDismissed={load} />
            ))}
          </div>
        </Section>
      )}

      {s.readyForAnother.length > 0 && (
        <Section icon={Clock} title="Ready for Another One?">
          <div className="flex flex-wrap gap-3">
            {s.readyForAnother.map((item) => (
              <Card key={item.id} className="w-40 border-none shadow-sm">
                <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.garmentName} className="size-full object-cover" />
                  ) : null}
                </div>
                <CardContent className="space-y-1.5 p-2.5">
                  <p className="truncate text-xs font-medium text-foreground">{item.garmentName}</p>
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/account/wardrobe?reorder=${item.id}`}>Reorder</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {s.becauseYouSaved.length > 0 && (
        <Section icon={Heart} title="Because You Saved">
          <DesignStrip items={s.becauseYouSaved} />
        </Section>
      )}

      {s.continueExploring.length > 0 && (
        <Section icon={Compass} title="Continue Exploring">
          <DesignStrip items={s.continueExploring} />
        </Section>
      )}

      {feed.hasLocation && s.trendingNearYou.length > 0 && (
        <Section icon={MapPin} title="Trending Near You">
          <BusinessStrip items={s.trendingNearYou} />
        </Section>
      )}

      {s.trendingDesigns.length > 0 && (
        <Section icon={TrendingUp} title="Trending Designs">
          <DesignStrip items={s.trendingDesigns} />
        </Section>
      )}

      {s.trendingDesigners.length > 0 && (
        <Section icon={TrendingUp} title="Trending Designers">
          <BusinessStrip items={s.trendingDesigners} />
        </Section>
      )}

      {s.topRated.length > 0 && (
        <Section icon={Star} title="Top Rated">
          <BusinessStrip items={s.topRated} />
        </Section>
      )}

      {s.recentlyAdded.length > 0 && (
        <Section icon={Clock} title="Recently Added">
          <DesignStrip items={s.recentlyAdded} />
        </Section>
      )}

      {s.yourWardrobe.length > 0 && (
        <Section icon={Shirt} title="Your Wardrobe">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {s.yourWardrobe.map((item) => (
              <div key={item.id} className="w-28 shrink-0">
                <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.garmentName} className="size-full object-cover" />
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-foreground">{item.garmentName}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
