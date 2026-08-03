"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Eye,
  Send,
  CheckCircle,
  User as UserIcon,
  Archive,
  ArchiveRestore,
  Image as ImageIcon,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/shared/components/user-avatar";
import { EmptyState } from "@/shared/components/empty-state";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { DesignPreviewStatusBadge } from "@/features/design-studio/components/design-preview-status-badge";
import { DesignShareDialog } from "@/features/design-studio/components/design-share-dialog";
import type { DesignPreviewListItem, DesignShareData } from "@/features/design-studio/types";

const NON_SENDABLE_STATUSES = new Set(["APPROVED", "LOCKED", "ARCHIVED"]);

const PREVIEW_TYPE_LABELS: Record<string, string> = {
  THREE_D: "3D Preview",
  TWO_D: "2D Preview",
};

export function DesignPreviewsTable({
  previews,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  previews: DesignPreviewListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const router = useRouter();
  const [shareDialogPreview, setShareDialogPreview] = useState<DesignPreviewListItem | null>(null);
  const [shareDialogShares, setShareDialogShares] = useState<DesignShareData[]>([]);
  const [loadingShareId, setLoadingShareId] = useState<string | null>(null);
  const [approveDialogPreview, setApproveDialogPreview] = useState<DesignPreviewListItem | null>(null);

  async function handleArchiveToggle(preview: DesignPreviewListItem) {
    const isArchived = preview.status === "ARCHIVED";
    const res = await fetch(`/api/design-previews/${preview.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isArchived ? "unarchive" : "archive" }),
    });
    if (!res.ok) {
      toast.error("Could not update design preview");
      return;
    }
    toast.success(isArchived ? "Design preview restored" : "Design preview archived");
    router.refresh();
  }

  async function handleOpenShareDialog(preview: DesignPreviewListItem) {
    setLoadingShareId(preview.id);
    try {
      const res = await fetch(`/api/design-previews/${preview.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load design preview");
      setShareDialogShares(data.preview?.shares ?? []);
      setShareDialogPreview(preview);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load design preview");
    } finally {
      setLoadingShareId(null);
    }
  }

  async function handleRequestApproval(preview: DesignPreviewListItem) {
    const res = await fetch(`/api/design-previews/${preview.id}/send`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not send design preview for review");
      return;
    }
    toast.success("Design preview sent for customer review");
    router.refresh();
  }

  if (previews.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No design previews found"
        description="Create your first design preview to start the approval workflow."
      />
    );
  }

  const allSelected = previews.every((p) => selectedIds.has(p.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} aria-label="Select all" />
            </TableHead>
            <TableHead>Design ID</TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Design Name</TableHead>
            <TableHead>Preview Type</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Approval Status</TableHead>
            <TableHead>Revisions</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {previews.map((preview) => {
            const canSend = !NON_SENDABLE_STATUSES.has(preview.status);
            const isArchived = preview.status === "ARCHIVED";
            return (
              <TableRow
                key={preview.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/3d-studio/${preview.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(preview.id)}
                    onCheckedChange={() => onToggleSelect(preview.id)}
                    aria-label={`Select ${preview.previewCode}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{preview.previewCode}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Link href={`/dashboard/orders/${preview.order.id}`} className="text-primary hover:underline">
                    {preview.order.orderCode}
                  </Link>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Link href={`/dashboard/customers/${preview.customer.id}`} className="flex items-center gap-3">
                    <UserAvatar
                      name={`${preview.customer.firstName} ${preview.customer.lastName}`}
                      image={preview.customer.profilePhotoUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground hover:underline">
                        {preview.customer.firstName} {preview.customer.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {preview.customer.phone ?? preview.customer.email ?? "N/A"}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{preview.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{PREVIEW_TYPE_LABELS[preview.previewType] ?? preview.previewType}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">Version {preview.latestVersionNumber}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(preview.createdAt)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(preview.updatedAt)}</TableCell>
                <TableCell>
                  <DesignPreviewStatusBadge status={preview.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{preview.revisionCount}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/3d-studio/${preview.id}`}>
                          <Eye /> View
                        </Link>
                      </DropdownMenuItem>
                      {canSend && (
                        <DropdownMenuItem
                          disabled={loadingShareId === preview.id}
                          onClick={() => handleOpenShareDialog(preview)}
                        >
                          <Send /> Send to Customer
                        </DropdownMenuItem>
                      )}
                      {canSend && (
                        <DropdownMenuItem onClick={() => setApproveDialogPreview(preview)}>
                          <CheckCircle /> Request Approval
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/customers/${preview.customer.id}`}>
                          <UserIcon /> View Customer
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleArchiveToggle(preview)}>
                        {isArchived ? (
                          <>
                            <ArchiveRestore /> Unarchive
                          </>
                        ) : (
                          <>
                            <Archive /> Archive
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {shareDialogPreview && (
        <DesignShareDialog
          open={!!shareDialogPreview}
          onOpenChange={(open) => !open && setShareDialogPreview(null)}
          previewId={shareDialogPreview.id}
          shares={shareDialogShares}
        />
      )}

      {approveDialogPreview && (
        <ConfirmDialog
          open={!!approveDialogPreview}
          onOpenChange={(open) => !open && setApproveDialogPreview(null)}
          title="Request customer approval"
          description="Send the latest version to the customer for review?"
          confirmLabel="Send for review"
          onConfirm={() => handleRequestApproval(approveDialogPreview)}
        />
      )}
    </div>
  );
}
