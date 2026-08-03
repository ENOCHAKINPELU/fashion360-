import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { quotationStatusOptions } from "@/lib/validations/quotation";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-info-soft text-info",
  VIEWED: "bg-info-soft text-info",
  ACCEPTED: "bg-success-soft text-success",
  DECLINED: "bg-danger-soft text-danger",
  EXPIRED: "bg-warning-soft text-warning",
  CANCELLED: "bg-danger-soft text-danger",
  CONVERTED: "bg-accent-soft text-primary",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS = Object.fromEntries(quotationStatusOptions.map((o) => [o.value, o.label]));

export function QuotationStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT, className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
