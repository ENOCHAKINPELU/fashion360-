"use client";

import { useEffect, useRef } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { DesignCard } from "@/features/design-gallery/components/design-card";
import { EmptyState } from "@/shared/components/empty-state";
import type { DesignListItem } from "@/features/design-gallery/types";

export function DesignGalleryGrid({
  designs,
  view,
  loading,
  hasMore,
  onLoadMore,
  onOpenLightbox,
}: {
  designs: DesignListItem[];
  view: "grid" | "list";
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpenLightbox: (url: string) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!loading && designs.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No designs found"
        description="Try adjusting your search or filters, or add a new design to your gallery."
      />
    );
  }

  return (
    <div>
      {view === "grid" ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {designs.map((design) => (
            <DesignCard key={design.id} design={design} view="grid" onOpenLightbox={onOpenLightbox} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {designs.map((design) => (
            <DesignCard key={design.id} design={design} view="list" />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex justify-center py-6">
        {loading && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading designs...
          </span>
        )}
        {!hasMore && designs.length > 0 && (
          <span className="text-xs text-muted-foreground">You&apos;ve reached the end of the gallery.</span>
        )}
      </div>
    </div>
  );
}
