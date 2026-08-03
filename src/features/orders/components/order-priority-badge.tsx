import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  NORMAL: "bg-muted text-muted-foreground",
  HIGH: "bg-warning-soft text-warning",
  URGENT: "bg-danger-soft text-danger",
};

const PRIORITY_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export function OrderPriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <Badge className={cn("hover:bg-inherit", PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.NORMAL, className)}>
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}
