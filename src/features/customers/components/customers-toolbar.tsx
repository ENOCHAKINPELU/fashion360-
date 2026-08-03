"use client";

import { useEffect, useState } from "react";
import { Plus, Upload, Download, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/shared/components/search-input";
import { CustomersFiltersPopover, type CustomerFilters } from "@/features/customers/components/customers-filters-popover";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "status:asc", label: "Status" },
];

export function CustomersToolbar({
  search,
  filters,
  sort,
  onSearchChange,
  onFiltersChange,
  onSortChange,
  onAddCustomer,
  onImport,
  onExport,
}: {
  search: string;
  filters: CustomerFilters;
  sort: string;
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: CustomerFilters) => void;
  onSortChange: (sort: string) => void;
  onAddCustomer: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search by name, phone, email, or ID..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <CustomersFiltersPopover value={filters} onChange={onFiltersChange} />
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
        <Button variant="outline" size="sm" onClick={onImport} className="gap-1.5">
          <Upload className="size-4" /> Import
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
          <Download className="size-4" /> Export
        </Button>
        <Button size="sm" onClick={onAddCustomer} className="gap-1.5">
          <Plus className="size-4" /> Add Customer
        </Button>
      </div>
    </div>
  );
}
