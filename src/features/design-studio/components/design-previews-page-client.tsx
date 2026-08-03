"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Archive, ArchiveRestore, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesignPreviewsToolbar } from "@/features/design-studio/components/design-previews-toolbar";
import { DesignPreviewsTable } from "@/features/design-studio/components/design-previews-table";
import type { DesignPreviewFilters } from "@/features/design-studio/components/design-previews-filters-popover";
import type { DesignPreviewListItem } from "@/features/design-studio/types";

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function DesignPreviewsPageClient({
  previews,
  pagination,
}: {
  previews: DesignPreviewListItem[];
  pagination: Pagination;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filters: DesignPreviewFilters = useMemo(
    () => ({
      status: searchParams.get("status") ?? undefined,
    }),
    [searchParams]
  );
  const archived = searchParams.get("archived") === "true";
  const customerId = searchParams.get("customerId") ?? undefined;
  const orderId = searchParams.get("orderId") ?? undefined;

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const allSelected = previews.every((p) => prev.has(p.id));
      return allSelected ? new Set() : new Set(previews.map((p) => p.id));
    });
  }

  async function bulkAction(action: "archive" | "unarchive") {
    const ids = Array.from(selectedIds);
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/design-previews/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
      )
    );
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) {
      toast.error(`Could not update ${failed} of ${ids.length} design previews`);
    } else {
      toast.success(`Updated ${ids.length} design previews`);
    }
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <DesignPreviewsToolbar
        search={searchParams.get("search") ?? ""}
        filters={filters}
        sort={searchParams.get("sort") ?? "updatedAt:desc"}
        customerId={customerId}
        orderId={orderId}
        onSearchChange={(value) => updateParams({ search: value || undefined })}
        onFiltersChange={(next) => updateParams({ status: next.status })}
        onSortChange={(sort) => updateParams({ sort })}
      />

      <div className="flex items-center gap-2">
        <Button
          variant={archived ? "outline" : "secondary"}
          size="sm"
          onClick={() => updateParams({ archived: undefined, status: undefined })}
        >
          Active
        </Button>
        <Button
          variant={archived ? "secondary" : "outline"}
          size="sm"
          onClick={() => updateParams({ archived: "true", status: "ARCHIVED" })}
        >
          Archived
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-accent-soft px-4 py-2.5">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            {archived ? (
              <Button variant="outline" size="sm" onClick={() => bulkAction("unarchive")} className="gap-1.5 bg-surface">
                <ArchiveRestore className="size-3.5" /> Unarchive selected
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => bulkAction("archive")} className="gap-1.5 bg-surface">
                <Archive className="size-3.5" /> Archive selected
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())} aria-label="Clear selection">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <DesignPreviewsTable
        previews={previews}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} design previews
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
