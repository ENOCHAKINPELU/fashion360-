import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { RotateCcw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RefundListItem } from "@/features/payments/types";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  SUCCESSFUL: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
};

export function RefundsTable({ refunds }: { refunds: RefundListItem[] }) {
  if (refunds.length === 0) {
    return <EmptyState icon={RotateCcw} title="No refunds yet" description="Refunds you process will be tracked here." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Processed By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {refunds.map((refund) => (
            <TableRow key={refund.id}>
              <TableCell className="text-muted-foreground">{formatDate(refund.createdAt)}</TableCell>
              <TableCell className="text-foreground">{refund.payment.invoice.invoiceNumber}</TableCell>
              <TableCell className="text-muted-foreground">
                {refund.payment.customer.firstName} {refund.payment.customer.lastName}
              </TableCell>
              <TableCell className="text-foreground">{formatCurrency(refund.amount, refund.payment.currency)}</TableCell>
              <TableCell className="text-muted-foreground">{refund.type}</TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{refund.reason}</TableCell>
              <TableCell>
                <Badge className={STATUS_STYLES[refund.status] ?? STATUS_STYLES.PENDING}>{refund.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{refund.processedBy?.name ?? "N/A"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
