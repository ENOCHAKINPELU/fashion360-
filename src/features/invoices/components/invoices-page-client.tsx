"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/shared/components/search-input";
import { InvoicesTable } from "@/features/invoices/components/invoices-table";
import { invoiceStatusOptions } from "@/lib/validations/invoice";
import type { InvoiceListItem } from "@/features/invoices/types";

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function InvoicesPageClient({ invoices, pagination }: { invoices: InvoiceListItem[]; pagination: Pagination }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get("search") ?? "");

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

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localSearch !== (searchParams.get("search") ?? "")) updateParams({ search: localSearch || undefined });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const orderId = searchParams.get("orderId") ?? undefined;
  const newHref = orderId ? `/dashboard/invoices/new?orderId=${orderId}` : "/dashboard/invoices/new";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput
            placeholder="Search by invoice, order, or customer..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => updateParams({ status: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {invoiceStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild className="gap-1.5">
          <Link href={newHref}>
            <Plus className="size-4" /> Create Invoice
          </Link>
        </Button>
      </div>

      <InvoicesTable invoices={invoices} />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} invoices
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="icon-sm" disabled={pagination.page <= 1} onClick={() => updateParams({ page: String(pagination.page - 1) })}>
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
