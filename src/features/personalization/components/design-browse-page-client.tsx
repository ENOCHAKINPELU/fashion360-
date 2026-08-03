"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { Compass } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DesignRow {
  id: string;
  name: string;
  mainImageUrl: string | null;
  basePrice: number | null;
  businessId: string;
  business: { name: string };
}

export function DesignBrowsePageClient({
  designs,
  pagination,
  favoritedIds,
}: {
  designs: DesignRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  favoritedIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [favorites, setFavorites] = useState(new Set(favoritedIds));

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!("page" in patch)) next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  async function toggleFavorite(designId: string) {
    const isFavorited = favorites.has(designId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.delete(designId);
      else next.add(designId);
      return next;
    });
    try {
      await fetch(`/api/customer/designs/${designId}/favorite`, { method: "POST" });
    } catch {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorited) next.add(designId);
        else next.delete(designId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search designs, categories, occasions…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParams({ search: searchValue || undefined })}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => updateParams({ search: searchValue || undefined })}>
          Search
        </Button>
        <Select value={searchParams.get("sort") ?? "newest"} onValueChange={(v) => updateParams({ sort: v === "newest" ? undefined : v })}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {designs.length === 0 ? (
        <EmptyState icon={Compass} title="No designs found" description="Try adjusting your search." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {designs.map((design) => (
            <Card key={design.id} className="group overflow-hidden border-none shadow-sm">
              <div className="relative">
                <Link href={`/account/designs/browse/${design.id}`}>
                  <div className="aspect-[3/4] bg-muted">
                    {design.mainImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={design.mainImageUrl} alt={design.name} className="size-full object-cover transition-transform group-hover:scale-105" />
                    ) : null}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(design.id)}
                  aria-label={favorites.has(design.id) ? "Remove from saved" : "Save design"}
                  className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-colors hover:bg-white"
                >
                  <Heart className={favorites.has(design.id) ? "size-4 fill-danger text-danger" : "size-4"} />
                </button>
              </div>
              <CardContent className="space-y-0.5 p-3">
                <Link href={`/account/designs/browse/${design.id}`}>
                  <p className="truncate text-sm font-medium text-foreground">{design.name}</p>
                </Link>
                <p className="truncate text-xs text-muted-foreground">{design.business.name}</p>
                {design.basePrice != null && <p className="text-xs font-medium text-foreground">{formatCurrency(design.basePrice, "NGN")}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => updateParams({ page: String(pagination.page - 1) })}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => updateParams({ page: String(pagination.page + 1) })}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
