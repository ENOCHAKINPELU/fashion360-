import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING_CONFIRMATION: "bg-warning/10 text-warning",
  SCHEDULED: "bg-info/10 text-info",
  CONFIRMED: "bg-primary/10 text-primary",
  CHECKED_IN: "bg-secondary/10 text-secondary",
  IN_PROGRESS: "bg-primary/10 text-primary",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
  NO_SHOW: "bg-danger/10 text-danger",
  RESCHEDULED: "bg-warning/10 text-warning",
  DECLINED: "bg-danger/10 text-danger",
  RESCHEDULE_REQUESTED: "bg-warning/10 text-warning",
  EXPIRED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: "Pending Confirmation",
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  RESCHEDULED: "Rescheduled",
  DECLINED: "Declined",
  RESCHEDULE_REQUESTED: "Reschedule Requested",
  EXPIRED: "Expired",
};

export function AppointmentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("border-transparent font-medium", STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
