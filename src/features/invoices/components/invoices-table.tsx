"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Eye, Copy, Archive, Receipt } from "lucide-react";
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
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import type { InvoiceListItem } from "@/features/invoices/types";

export function InvoicesTable({ invoices }: { invoices: InvoiceListItem[] }) {
  const router = useRouter();

  async function duplicateInvoice(id: string) {
    const res = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not duplicate invoice");
      return;
    }
    toast.success(`Duplicated as ${data.invoice.invoiceNumber}`);
    router.push(`/dashboard/invoices/${data.invoice.id}`);
  }

  async function archiveInvoice(id: string) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    if (!res.ok) {
      toast.error("Could not archive invoice");
      return;
    }
    toast.success("Invoice archived");
    router.refresh();
  }

  if (invoices.length === 0) {
    return <EmptyState icon={Receipt} title="No invoices found" description="Create your first invoice or convert an accepted quotation." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}>
              <TableCell className="font-medium text-foreground">{invoice.invoiceNumber}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Link href={`/dashboard/orders/${invoice.order.id}`} className="text-primary hover:underline">
                  {invoice.order.orderCode}
                </Link>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Link href={`/dashboard/customers/${invoice.customer.id}`} className="flex items-center gap-3">
                  <UserAvatar name={`${invoice.customer.firstName} ${invoice.customer.lastName}`} image={invoice.customer.profilePhotoUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground hover:underline">
                      {invoice.customer.firstName} {invoice.customer.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{invoice.customer.customerCode}</p>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatCurrency(invoice.total, invoice.currency)}</TableCell>
              <TableCell className="text-muted-foreground">{formatCurrency(invoice.amountPaid, invoice.currency)}</TableCell>
              <TableCell className="text-muted-foreground">{formatCurrency(invoice.balanceDue, invoice.currency)}</TableCell>
              <TableCell className="text-muted-foreground">{invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"}</TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Row actions">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <Eye /> View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateInvoice(invoice.id)}>
                      <Copy /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => archiveInvoice(invoice.id)}>
                      <Archive /> Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
