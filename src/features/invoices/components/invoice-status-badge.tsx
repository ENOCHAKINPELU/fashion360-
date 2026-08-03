import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invoiceStatusOptions } from "@/lib/validations/invoice";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-info-soft text-info",
  VIEWED: "bg-info-soft text-info",
  PARTIALLY_PAID: "bg-warning-soft text-warning",
  PAID: "bg-success-soft text-success",
  OVERDUE: "bg-danger-soft text-danger",
  VOID: "bg-muted text-muted-foreground",
  CANCELLED: "bg-danger-soft text-danger",
  REFUNDED: "bg-accent-soft text-secondary",
  PARTIALLY_REFUNDED: "bg-accent-soft text-secondary",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS = Object.fromEntries(invoiceStatusOptions.map((o) => [o.value, o.label]));

export function InvoiceStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT, className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
