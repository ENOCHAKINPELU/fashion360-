import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { designPreviewStatusOptions } from "@/lib/validations/design-preview";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PREVIEW_READY: "bg-info-soft text-info",
  SENT_FOR_REVIEW: "bg-info-soft text-info",
  UNDER_CUSTOMER_REVIEW: "bg-warning-soft text-warning",
  REVISION_REQUESTED: "bg-warning-soft text-warning",
  UPDATED: "bg-accent-soft text-primary",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  ARCHIVED: "bg-muted text-muted-foreground",
  LOCKED: "bg-success-soft text-success",
};

const STATUS_LABELS = Object.fromEntries(designPreviewStatusOptions.map((o) => [o.value, o.label]));

export function DesignPreviewStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT, className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
