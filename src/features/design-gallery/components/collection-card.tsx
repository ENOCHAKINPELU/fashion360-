"use client";

import Link from "next/link";
import { Images } from "lucide-react";
import { DesignStatusBadge } from "@/features/design-gallery/components/design-status-badge";
import type { DesignCollectionOption } from "@/features/design-gallery/types";

export function CollectionCard({ collection }: { collection: DesignCollectionOption }) {
  return (
    <Link
      href={`/dashboard/design-gallery/collections/${collection.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        {collection.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.coverImageUrl}
            alt={collection.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Images className="size-8" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-foreground">{collection.name}</p>
          <DesignStatusBadge status={collection.status} />
        </div>
        {collection.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{collection._count?.designs ?? 0} designs</p>
      </div>
    </Link>
  );
}
