"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart, X, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
}

// Part 8: browse, full-screen view, filter by category, favorite, share.
// Not a design-customization tool — just viewing the business's existing work.
export function PortfolioGallery({
  items,
  favoritedIds,
}: {
  items: PortfolioItem[];
  favoritedIds: string[];
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [active, setActive] = useState<PortfolioItem | null>(null);
  const [favorites, setFavorites] = useState(new Set(favoritedIds));

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter((c): c is string => !!c))), [items]);
  const filtered = category ? items.filter((i) => i.category === category) : items;
  const canFavorite = status === "authenticated" && session.user.role === "CUSTOMER";

  async function toggleFavorite(itemId: string) {
    const isFavorited = favorites.has(itemId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    try {
      const res = await fetch(`/api/portfolio/${itemId}/favorite`, { method: isFavorited ? "DELETE" : "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update favorites");
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorited) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
    }
  }

  async function share(item: PortfolioItem) {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share) {
      await navigator.share({ title: item.title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  if (items.length === 0) {
    return <EmptyState icon={Star} title="No Portfolio Items" description="This business hasn't added any portfolio items yet." className="border-none py-10" />;
  }

  return (
    <div className="space-y-3">
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!category ? "border-primary bg-accent-soft text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === c ? "border-primary bg-accent-soft text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((item) => (
          <div key={item.id} className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-muted" onClick={() => setActive(item)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.title} className="size-full object-cover transition-transform group-hover:scale-105" />
            {canFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id);
                }}
                aria-label="Favorite"
                className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Heart className={favorites.has(item.id) ? "size-3.5 fill-danger text-danger" : "size-3.5"} />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-2xl border-none bg-transparent p-0 shadow-none [&>button]:hidden">
          {active && (
            <div className="overflow-hidden rounded-2xl bg-background">
              <div className="relative bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.imageUrl} alt={active.title} className="max-h-[70vh] w-full object-contain" />
                <button
                  onClick={() => setActive(null)}
                  aria-label="Close"
                  className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{active.title}</p>
                    {active.category && <p className="text-xs text-muted-foreground">{active.category}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {canFavorite && (
                      <Button variant="outline" size="icon-sm" onClick={() => toggleFavorite(active.id)} aria-label="Favorite">
                        <Heart className={favorites.has(active.id) ? "size-4 fill-danger text-danger" : "size-4"} />
                      </Button>
                    )}
                    <Button variant="outline" size="icon-sm" onClick={() => share(active)} aria-label="Share">
                      <Share2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}
                {active.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {active.tags.map((t) => (
                      <span key={t} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
