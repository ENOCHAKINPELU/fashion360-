import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAYMENT_STYLES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  PARTIALLY_PAID: "bg-warning-soft text-warning",
  PAID: "bg-success-soft text-success",
  OVERDUE: "bg-danger-soft text-danger",
  REFUNDED: "bg-info-soft text-info",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  REFUNDED: "Refunded",
};

export function OrderPaymentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", PAYMENT_STYLES[status] ?? PAYMENT_STYLES.PENDING, className)}>
      {PAYMENT_LABELS[status] ?? status}
    </Badge>
  );
}
