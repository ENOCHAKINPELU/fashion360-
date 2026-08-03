"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Clock, ImageOff } from "lucide-react";
import { DesignStatusBadge } from "@/features/design-gallery/components/design-status-badge";
import { DesignTagBadge } from "@/features/design-gallery/components/design-tag-badge";
import type { DesignListItem } from "@/features/design-gallery/types";
import { cn } from "@/lib/utils";

export function DesignCard({
  design,
  view = "grid",
  onOpenLightbox,
}: {
  design: DesignListItem;
  view?: "grid" | "list";
  onOpenLightbox?: (url: string) => void;
}) {
  const favoriteCount = design._count?.favorites ?? 0;

  if (view === "list") {
    return (
      <Link
        href={`/dashboard/design-gallery/${design.id}`}
        className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {design.mainImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.mainImageUrl} alt={design.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{design.name}</p>
            <DesignStatusBadge status={design.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {design.category?.name ?? "Uncategorized"} · {design.designCode}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
          {design.basePrice != null && (
            <span className="font-medium text-foreground">₦{design.basePrice.toLocaleString()}</span>
          )}
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" /> {favoriteCount}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="group mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-lg"
    >
      <button
        type="button"
        className="relative block w-full overflow-hidden bg-muted"
        onClick={() => design.mainImageUrl && onOpenLightbox?.(design.mainImageUrl)}
      >
        {design.mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.mainImageUrl}
            alt={design.name}
            className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <DesignStatusBadge status={design.status} className={cn(design.status === "PUBLISHED" ? "opacity-0 group-hover:opacity-100" : "", "transition-opacity")} />
          {favoriteCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <Heart className="size-3 fill-current" /> {favoriteCount}
            </span>
          )}
        </div>
        {design.isFeatured && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            Featured
          </span>
        )}
      </button>

      <Link href={`/dashboard/design-gallery/${design.id}`} className="block p-3.5">
        <p className="truncate text-sm font-semibold text-foreground">{design.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{design.category?.name ?? "Uncategorized"}</p>

        {design.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {design.tags.slice(0, 3).map((tag) => (
              <DesignTagBadge key={tag.id} name={tag.name} color={tag.color} />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          {design.basePrice != null ? (
            <span className="font-medium text-foreground">₦{design.basePrice.toLocaleString()}</span>
          ) : (
            <span />
          )}
          {design.estimatedCompletionDays != null && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {design.estimatedCompletionDays}d
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
