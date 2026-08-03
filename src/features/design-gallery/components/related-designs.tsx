"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { DesignListItem } from "@/features/design-gallery/types";

export function RelatedDesigns({ designId }: { designId: string }) {
  const [designs, setDesigns] = useState<DesignListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/designs/${designId}/related`)
      .then((res) => res.json())
      .then((data) => setDesigns(data.designs ?? []))
      .finally(() => setLoading(false));
  }, [designId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading related designs...</p>;
  if (designs.length === 0) return <p className="text-sm text-muted-foreground">No related designs yet.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {designs.map((design) => (
        <Link
          key={design.id}
          href={`/dashboard/design-gallery/${design.id}`}
          className="group overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="aspect-square overflow-hidden bg-muted">
            {design.images[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={design.images[0].url}
                alt={design.name}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-5" />
              </div>
            )}
          </div>
          <p className="truncate p-2 text-xs font-medium text-foreground">{design.name}</p>
        </Link>
      ))}
    </div>
  );
}
