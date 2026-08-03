import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { designVersionStatusOptions } from "@/lib/validations/design-preview";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-info-soft text-info",
  SUPERSEDED: "bg-muted text-muted-foreground",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
};

const STATUS_LABELS = Object.fromEntries(designVersionStatusOptions.map((o) => [o.value, o.label]));

export function DesignVersionStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT, className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
