import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  DESIGN_IN_PROGRESS: { label: "Design In Progress", className: "bg-info-soft text-info" },
  DESIGN_SUBMITTED: { label: "Submitted", className: "bg-info-soft text-info" },
  CUSTOMER_REVIEW: { label: "Awaiting Customer Review", className: "bg-warning-soft text-warning" },
  CHANGES_REQUESTED: { label: "Changes Requested", className: "bg-warning-soft text-warning" },
  REVISION_IN_PROGRESS: { label: "Revision In Progress", className: "bg-info-soft text-info" },
  REVISION_SUBMITTED: { label: "Revision Submitted", className: "bg-info-soft text-info" },
  CUSTOMER_APPROVED: { label: "Customer Approved", className: "bg-success-soft text-success" },
  DESIGN_LOCKED: { label: "Locked: Ready for Quotation", className: "bg-success-soft text-success" },
  CANCELLED: { label: "Cancelled", className: "bg-danger-soft text-danger" },
};

export function DesignProjectStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status.replace(/_/g, " "), className: "bg-muted text-muted-foreground" };
  return <Badge className={cn(meta.className, "capitalize", className)}>{meta.label}</Badge>;
}
