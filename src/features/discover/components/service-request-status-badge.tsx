import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-warning-soft text-warning",
  RECEIVED: "bg-warning-soft text-warning",
  UNDER_REVIEW: "bg-info-soft text-info",
  ACCEPTED: "bg-success-soft text-success",
  DECLINED: "bg-danger-soft text-danger",
  CANCELLED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
  CONVERTED_TO_APPOINTMENT: "bg-success-soft text-success",
  CONVERTED_TO_ORDER: "bg-success-soft text-success",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  RECEIVED: "Received",
  UNDER_REVIEW: "Under Review",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  CONVERTED_TO_APPOINTMENT: "Converted to Appointment",
  CONVERTED_TO_ORDER: "Converted to Order",
};

export function ServiceRequestStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT, className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
