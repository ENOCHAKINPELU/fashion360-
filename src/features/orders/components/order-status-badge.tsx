import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { orderStatusOptions } from "@/lib/validations/order";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_CONFIRMATION: "bg-warning-soft text-warning",
  CONFIRMED: "bg-info-soft text-info",
  AWAITING_PAYMENT: "bg-warning-soft text-warning",
  READY_FOR_PRODUCTION: "bg-info-soft text-info",
  IN_PRODUCTION: "bg-accent-soft text-primary",
  FITTING: "bg-accent-soft text-secondary",
  ALTERATION: "bg-warning-soft text-warning",
  FINAL_INSPECTION: "bg-info-soft text-info",
  COMPLETED: "bg-success-soft text-success",
  READY_FOR_PICKUP: "bg-success-soft text-success",
  OUT_FOR_DELIVERY: "bg-info-soft text-info",
  DELIVERED: "bg-success-soft text-success",
  CANCELLED: "bg-danger-soft text-danger",
  ON_HOLD: "bg-muted text-muted-foreground",
  QUALITY_CHECK: "bg-info-soft text-info",
  QUALITY_CHECK_FAILED: "bg-danger-soft text-danger",
  IN_TRANSIT: "bg-info-soft text-info",
  DISPUTED: "bg-danger-soft text-danger",
  REFUND_PROCESSING: "bg-warning-soft text-warning",
  REFUNDED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS = Object.fromEntries(orderStatusOptions.map((o) => [o.value, o.label]));

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT, className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
