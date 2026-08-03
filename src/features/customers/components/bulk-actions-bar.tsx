"use client";

import { Archive, ArchiveRestore, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BulkActionsBar({
  count,
  archived,
  onArchive,
  onUnarchive,
  onTag,
  onDelete,
  onClear,
}: {
  count: number;
  archived: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onTag: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-accent-soft px-4 py-2.5">
      <span className="text-sm font-medium text-primary">{count} selected</span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onTag} className="gap-1.5 bg-surface">
          <Tag className="size-3.5" /> Tag
        </Button>
        {archived ? (
          <Button variant="outline" size="sm" onClick={onUnarchive} className="gap-1.5 bg-surface">
            <ArchiveRestore className="size-3.5" /> Restore
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onArchive} className="gap-1.5 bg-surface">
            <Archive className="size-3.5" /> Archive
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1.5">
          <Trash2 className="size-3.5" /> Delete
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear selection">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
