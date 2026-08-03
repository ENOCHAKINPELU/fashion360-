"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Compass, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { BusinessCard, type DiscoverBusiness } from "@/features/discover/components/business-card";
import { DiscoverFiltersPopover, type DiscoverFilters } from "@/features/discover/components/discover-filters-popover";

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended", disabled: false },
  { value: "rating", label: "Highest Rated", disabled: false },
  { value: "newest", label: "Newest", disabled: false },
  { value: "popular", label: "Most Popular", disabled: false },
  { value: "closest", label: "Closest", disabled: true },
  { value: "response", label: "Fastest Response", disabled: true },
];

export function DiscoverPageClient({
  businesses,
  pagination,
  favoriteBusinessIds,
  filterOptions,
}: {
  businesses: DiscoverBusiness[];
  pagination: Pagination;
  favoriteBusinessIds: string[];
  filterOptions: { locations: string[]; specialties: string[]; categories: string[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [favorites, setFavorites] = useState(new Set(favoriteBusinessIds));

  const sort = searchParams.get("sort") ?? "recommended";
  const rankedSortDisabled = SORT_OPTIONS.find((o) => o.value === sort)?.disabled;

  const filters: DiscoverFilters = useMemo(
    () => ({
      location: searchParams.get("location") ?? undefined,
      specialty: searchParams.get("specialty") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      verified: searchParams.get("verified") ?? undefined,
      available: searchParams.get("available") ?? undefined,
      priceMin: searchParams.get("priceMin") ?? undefined,
      priceMax: searchParams.get("priceMax") ?? undefined,
      minRating: searchParams.get("minRating") ?? undefined,
      verifiedReviews: searchParams.get("verifiedReviews") ?? undefined,
      topRated: searchParams.get("topRated") ?? undefined,
      reliableDelivery: searchParams.get("reliableDelivery") ?? undefined,
      fastResponse: searchParams.get("fastResponse") ?? undefined,
      newDesigners: searchParams.get("newDesigners") ?? undefined,
      popularDesigners: searchParams.get("popularDesigners") ?? undefined,
    }),
    [searchParams]
  );

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      if (!("page" in patch)) next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams]
  );

  function toggleFavorite(businessId: string, isFavorited: boolean) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.add(businessId);
      else next.delete(businessId);
      return next;
    });
    fetch(`/api/businesses/${businessId}/favorite`, { method: isFavorited ? "POST" : "DELETE" }).catch(() => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorited) next.delete(businessId);
        else next.add(businessId);
        return next;
      });
    });
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Discover</h1>
        <p className="text-sm text-muted-foreground">Find fashion businesses and designers on Fashion360.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, specialty, service, or location…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateParams({ search: searchValue || undefined })}
          />
        </div>
        <Button variant="outline" onClick={() => updateParams({ search: searchValue || undefined })} className="sm:w-auto">
          Search
        </Button>
        <DiscoverFiltersPopover
          filters={filters}
          options={filterOptions}
          activeCount={activeFilterCount}
          onChange={(next) =>
            updateParams({
              location: next.location,
              specialty: next.specialty,
              category: next.category,
              verified: next.verified,
              available: next.available,
              priceMin: next.priceMin,
              priceMax: next.priceMax,
              minRating: next.minRating,
              verifiedReviews: next.verifiedReviews,
              topRated: next.topRated,
              reliableDelivery: next.reliableDelivery,
              fastResponse: next.fastResponse,
              newDesigners: next.newDesigners,
              popularDesigners: next.popularDesigners,
            })
          }
        />
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value === "recommended" ? undefined : e.target.value })}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rankedSortDisabled && <p className="text-xs text-muted-foreground">Not enough data to rank, showing Recommended instead.</p>}

      {businesses.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No Designers Found"
          description="Try changing your search or filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              isFavorited={favorites.has(business.id)}
              onToggleFavorite={(next) => toggleFavorite(business.id, next)}
            />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} businesses
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page <= 1}
              onClick={() => updateParams({ page: String(pagination.page - 1) })}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParams({ page: String(pagination.page + 1) })}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
