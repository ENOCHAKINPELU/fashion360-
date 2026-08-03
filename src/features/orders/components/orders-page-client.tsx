"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Archive, ArchiveRestore, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrdersToolbar } from "@/features/orders/components/orders-toolbar";
import { OrdersTable } from "@/features/orders/components/orders-table";
import type { OrderFilters } from "@/features/orders/types";
import type { OrderListItem } from "@/features/orders/types";

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function OrdersPageClient({
  orders,
  pagination,
}: {
  orders: OrderListItem[];
  pagination: Pagination;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filters: OrderFilters = useMemo(
    () => ({
      status: searchParams.get("status") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      orderType: searchParams.get("orderType") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    }),
    [searchParams]
  );
  const archived = searchParams.get("archived") === "true";
  const customerId = searchParams.get("customerId") ?? undefined;

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
      const allSelected = orders.every((o) => prev.has(o.id));
      return allSelected ? new Set() : new Set(orders.map((o) => o.id));
    });
  }

  async function bulkAction(action: "archive" | "unarchive") {
    const res = await fetch("/api/orders/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), action }),
    });
    if (!res.ok) {
      toast.error("Bulk action failed");
      return;
    }
    const data = await res.json();
    toast.success(`Updated ${data.count} orders`);
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <OrdersToolbar
        search={searchParams.get("search") ?? ""}
        filters={filters}
        sort={searchParams.get("sort") ?? "orderDate:desc"}
        customerId={customerId}
        onSearchChange={(value) => updateParams({ search: value || undefined })}
        onFiltersChange={(next) =>
          updateParams({
            status: next.status,
            paymentStatus: next.paymentStatus,
            orderType: next.orderType,
            priority: next.priority,
            dateFrom: next.dateFrom,
            dateTo: next.dateTo,
          })
        }
        onSortChange={(sort) => updateParams({ sort })}
      />

      <div className="flex items-center gap-2">
        <Button
          variant={archived ? "outline" : "secondary"}
          size="sm"
          onClick={() => updateParams({ archived: undefined })}
        >
          Active
        </Button>
        <Button
          variant={archived ? "secondary" : "outline"}
          size="sm"
          onClick={() => updateParams({ archived: "true" })}
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

      <OrdersTable
        orders={orders}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders
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
