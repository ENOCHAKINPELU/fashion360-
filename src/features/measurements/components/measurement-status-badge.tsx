import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-warning/10 text-warning",
  PENDING_REVIEW: "bg-info/10 text-info",
  APPROVED: "bg-success/10 text-success",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
};

export function MeasurementStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("border-transparent font-medium", STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

const SOURCE_LABELS: Record<string, string> = { MANUAL: "Manual", AI_ESTIMATED: "Photo Estimated" };

export function MeasurementSourceBadge({ source, className }: { source: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal text-muted-foreground", className)}>
      {SOURCE_LABELS[source] ?? source}
    </Badge>
  );
}
