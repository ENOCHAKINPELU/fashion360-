"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/shared/components/search-input";
import { OrdersFiltersPopover } from "@/features/orders/components/orders-filters-popover";
import type { OrderFilters } from "@/features/orders/types";

const SORT_OPTIONS = [
  { value: "orderDate:desc", label: "Newest first" },
  { value: "orderDate:asc", label: "Oldest first" },
  { value: "orderCode:asc", label: "Order ID" },
  { value: "totalValue:desc", label: "Highest value" },
  { value: "priority:desc", label: "Priority" },
];

export function OrdersToolbar({
  search,
  filters,
  sort,
  customerId,
  onSearchChange,
  onFiltersChange,
  onSortChange,
}: {
  search: string;
  filters: OrderFilters;
  sort: string;
  customerId?: string;
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: OrderFilters) => void;
  onSortChange: (sort: string) => void;
}) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const newOrderHref = customerId ? `/dashboard/orders/new?customerId=${customerId}` : "/dashboard/orders/new";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search by order ID, customer, phone, email, or design..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <OrdersFiltersPopover value={filters} onChange={onFiltersChange} />
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[160px] gap-1.5">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link href={newOrderHref}>
            <Plus className="size-4" /> New Order
          </Link>
        </Button>
      </div>
    </div>
  );
}
