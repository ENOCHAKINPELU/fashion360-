"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DesignGalleryToolbar } from "@/features/design-gallery/components/design-gallery-toolbar";
import { DesignGalleryGrid } from "@/features/design-gallery/components/design-gallery-grid";
import { DesignFormDialog } from "@/features/design-gallery/components/design-form-dialog";
import { ImageLightbox } from "@/features/design-gallery/components/image-lightbox";
import type { DesignListItem, DesignFilters, DesignCategoryOption, DesignCollectionOption } from "@/features/design-gallery/types";

export function DesignGalleryClient({
  categories,
  collections,
}: {
  categories: DesignCategoryOption[];
  collections: DesignCollectionOption[];
}) {
  const router = useRouter();
  const [designs, setDesigns] = useState<DesignListItem[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<DesignFilters>({});
  const [sort, setSort] = useState("createdAt:desc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadPage = useCallback(
    async (pageToLoad: number, append: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
        params.set("sort", sort);
        params.set("page", String(pageToLoad));

        const res = await fetch(`/api/designs?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load designs");

        setDesigns((prev) => (append ? [...prev, ...json.designs] : json.designs));
        setTotalPages(json.pagination.totalPages);
        setPage(pageToLoad);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [search, filters, sort]
  );

  useEffect(() => {
    loadPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters, sort]);

  return (
    <div className="space-y-5">
      <DesignGalleryToolbar
        search={search}
        filters={filters}
        sort={sort}
        view={view}
        categories={categories}
        collections={collections}
        onSearchChange={setSearch}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        onViewChange={setView}
        onAddDesign={() => setFormOpen(true)}
      />

      <DesignGalleryGrid
        designs={designs}
        view={view}
        loading={loading}
        hasMore={page < totalPages}
        onLoadMore={() => !loading && loadPage(page + 1, true)}
        onOpenLightbox={setLightboxUrl}
      />

      <DesignFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        categories={categories}
        collections={collections}
        onSaved={() => {
          loadPage(1, false);
          router.refresh();
        }}
      />

      <ImageLightbox url={lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)} />
    </div>
  );
}
