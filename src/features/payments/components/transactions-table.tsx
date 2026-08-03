import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { History } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { FinancialTransactionData } from "@/features/payments/types";

const TYPE_LABELS: Record<string, string> = {
  QUOTATION_CREATED: "Quotation Created",
  QUOTATION_SENT: "Quotation Sent",
  QUOTATION_VIEWED: "Quotation Viewed",
  QUOTATION_ACCEPTED: "Quotation Accepted",
  QUOTATION_DECLINED: "Quotation Declined",
  QUOTATION_REVISION_REQUESTED: "Revision Requested",
  QUOTATION_CONVERTED: "Quotation Converted",
  QUOTATION_CANCELLED: "Quotation Cancelled",
  QUOTATION_ARCHIVED: "Quotation Archived",
  INVOICE_CREATED: "Invoice Created",
  INVOICE_SENT: "Invoice Sent",
  INVOICE_VIEWED: "Invoice Viewed",
  INVOICE_VOIDED: "Invoice Voided",
  INVOICE_ARCHIVED: "Invoice Archived",
  PAYMENT_RECEIVED: "Payment Received",
  PAYMENT_FAILED: "Payment Failed",
  REFUND_CREATED: "Refund Created",
  REFUND_PROCESSED: "Refund Processed",
  GATEWAY_CONNECTED: "Gateway Connected",
  GATEWAY_DISCONNECTED: "Gateway Disconnected",
};

export function TransactionsTable({ transactions, currency }: { transactions: FinancialTransactionData[]; currency: string }) {
  if (transactions.length === 0) {
    return <EmptyState icon={History} title="No transactions yet" description="Financial activity will appear here as quotations, invoices, and payments happen." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Transaction</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABELS[tx.type] ?? tx.type}</Badge>
                <p className="mt-1 text-xs text-muted-foreground">{tx.description}</p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tx.customer ? (
                  <Link href={`/dashboard/customers/${tx.customer.id}`} className="text-primary hover:underline">
                    {tx.customer.firstName} {tx.customer.lastName}
                  </Link>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tx.invoice ? (
                  <Link href={`/dashboard/invoices/${tx.invoice.id}`} className="text-primary hover:underline">
                    {tx.invoice.invoiceNumber}
                  </Link>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tx.order ? (
                  <Link href={`/dashboard/orders/${tx.order.id}`} className="text-primary hover:underline">
                    {tx.order.orderCode}
                  </Link>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell className="text-foreground">{tx.amount != null ? formatCurrency(tx.amount, tx.currency ?? currency) : "N/A"}</TableCell>
              <TableCell className="text-muted-foreground">{tx.method ?? "N/A"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
