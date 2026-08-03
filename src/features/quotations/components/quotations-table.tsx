"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Eye, Copy, Archive, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/shared/components/user-avatar";
import { EmptyState } from "@/shared/components/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { QuotationStatusBadge } from "@/features/quotations/components/quotation-status-badge";
import type { QuotationListItem } from "@/features/quotations/types";

export function QuotationsTable({ quotations, currency }: { quotations: QuotationListItem[]; currency: string }) {
  const router = useRouter();

  async function duplicateQuotation(id: string) {
    const res = await fetch(`/api/quotations/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not duplicate quotation");
      return;
    }
    toast.success(`Duplicated as ${data.quotation.quotationNumber}`);
    router.push(`/dashboard/quotations/${data.quotation.id}`);
  }

  async function archiveQuotation(id: string) {
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    if (!res.ok) {
      toast.error("Could not archive quotation");
      return;
    }
    toast.success("Quotation archived");
    router.refresh();
  }

  if (quotations.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No quotations found"
        description="Create your first quotation to start the customer approval workflow."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quotation</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((quotation) => {
            const latest = quotation.versions[0];
            return (
              <TableRow
                key={quotation.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/quotations/${quotation.id}`)}
              >
                <TableCell className="font-medium text-foreground">{quotation.quotationNumber}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {quotation.order ? (
                    <Link href={`/dashboard/orders/${quotation.order.id}`} className="text-primary hover:underline">
                      {quotation.order.orderCode}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Pending acceptance</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Link href={`/dashboard/customers/${quotation.customer.id}`} className="flex items-center gap-3">
                    <UserAvatar
                      name={`${quotation.customer.firstName} ${quotation.customer.lastName}`}
                      image={quotation.customer.profilePhotoUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground hover:underline">
                        {quotation.customer.firstName} {quotation.customer.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{quotation.customer.customerCode}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">v{quotation.latestVersionNumber}</TableCell>
                <TableCell className="text-muted-foreground">{latest ? formatCurrency(latest.total, currency) : "N/A"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(quotation.createdAt)}</TableCell>
                <TableCell>
                  <QuotationStatusBadge status={quotation.status} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/quotations/${quotation.id}`}>
                          <Eye /> View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateQuotation(quotation.id)}>
                        <Copy /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => archiveQuotation(quotation.id)}>
                        <Archive /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
