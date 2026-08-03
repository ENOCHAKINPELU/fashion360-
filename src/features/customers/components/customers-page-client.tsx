"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomersToolbar } from "@/features/customers/components/customers-toolbar";
import { CustomersTable } from "@/features/customers/components/customers-table";
import { BulkActionsBar } from "@/features/customers/components/bulk-actions-bar";
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog";
import { ImportCustomersDialog } from "@/features/customers/components/import-customers-dialog";
import { ExportCustomersDialog } from "@/features/customers/components/export-customers-dialog";
import { BulkTagDialog } from "@/features/customers/components/bulk-tag-dialog";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import type { CustomerFilters } from "@/features/customers/components/customers-filters-popover";
import type { CustomerListItem } from "@/features/customers/types";
import type { CustomerFormInput } from "@/lib/validations/customer";

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function CustomersPageClient({
  customers,
  pagination,
}: {
  customers: CustomerListItem[];
  pagination: Pagination;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formDialog, setFormDialog] = useState<{ open: boolean; customer?: CustomerListItem }>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filters: CustomerFilters = useMemo(
    () => ({
      status: searchParams.get("status") ?? undefined,
      gender: searchParams.get("gender") ?? undefined,
      vip: searchParams.get("vip") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    }),
    [searchParams]
  );
  const archived = searchParams.get("archived") === "true";

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
      const allSelected = customers.every((c) => prev.has(c.id));
      return allSelected ? new Set() : new Set(customers.map((c) => c.id));
    });
  }

  async function handleArchiveToggle(customer: CustomerListItem) {
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: customer.isArchived ? "unarchive" : "archive" }),
    });
    if (!res.ok) {
      toast.error("Could not update customer");
      return;
    }
    toast.success(customer.isArchived ? "Customer restored" : "Customer archived");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete customer");
      return;
    }
    toast.success("Customer deleted");
    router.refresh();
  }

  async function bulkAction(action: "archive" | "unarchive" | "delete" | "tag", tagId?: string) {
    const res = await fetch("/api/customers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), action, tagId }),
    });
    if (!res.ok) {
      toast.error("Bulk action failed");
      return;
    }
    const data = await res.json();
    toast.success(`Updated ${data.count} customers`);
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <CustomersToolbar
        search={searchParams.get("search") ?? ""}
        filters={filters}
        sort={searchParams.get("sort") ?? "createdAt:desc"}
        onSearchChange={(value) => updateParams({ search: value || undefined })}
        onFiltersChange={(next) =>
          updateParams({
            status: next.status,
            gender: next.gender,
            vip: next.vip,
            dateFrom: next.dateFrom,
            dateTo: next.dateTo,
          })
        }
        onSortChange={(sort) => updateParams({ sort })}
        onAddCustomer={() => setFormDialog({ open: true })}
        onImport={() => setImportOpen(true)}
        onExport={() => setExportOpen(true)}
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

      <BulkActionsBar
        count={selectedIds.size}
        archived={archived}
        onArchive={() => bulkAction("archive")}
        onUnarchive={() => bulkAction("unarchive")}
        onTag={() => setBulkTagOpen(true)}
        onDelete={() => setBulkDeleteOpen(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      <CustomersTable
        customers={customers}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onEdit={(customer) => setFormDialog({ open: true, customer })}
        onArchiveToggle={handleArchiveToggle}
        onDeleteRequest={setDeleteTarget}
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} customers
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

      <CustomerFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((prev) => ({ ...prev, open }))}
        mode={formDialog.customer ? "edit" : "create"}
        customerId={formDialog.customer?.id}
        defaultValues={
          formDialog.customer
            ? {
                profilePhotoUrl: formDialog.customer.profilePhotoUrl ?? "",
                firstName: formDialog.customer.firstName,
                lastName: formDialog.customer.lastName,
                email: formDialog.customer.email ?? "",
                phone: formDialog.customer.phone ?? "",
                whatsapp: formDialog.customer.whatsapp ?? "",
                status: formDialog.customer.status as CustomerFormInput["status"],
                isVip: formDialog.customer.isVip,
              }
            : undefined
        }
        defaultTagIds={formDialog.customer?.tags.map((t) => t.id)}
      />

      <ImportCustomersDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportCustomersDialog open={exportOpen} onOpenChange={setExportOpen} selectedIds={Array.from(selectedIds)} />
      <BulkTagDialog open={bulkTagOpen} onOpenChange={setBulkTagOpen} onApply={(tagId) => bulkAction("tag", tagId)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete customer?"
        description={`This will permanently delete ${deleteTarget?.firstName} ${deleteTarget?.lastName} and all associated notes and activity. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.size} customers?`}
        description="This will permanently delete the selected customers. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => bulkAction("delete")}
      />
    </div>
  );
}
