"use client";

import { DesignVersionStatusBadge } from "@/features/design-studio/components/design-version-status-badge";
import { formatDate, cn } from "@/lib/utils";
import type { DesignVersionData } from "@/features/design-studio/types";

export function DesignVersionHistory({
  versions,
  selectedVersionId,
  onSelectVersion,
  compareVersionId,
  onToggleCompare,
}: {
  versions: DesignVersionData[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  compareVersionId: string | null;
  onToggleCompare: (versionId: string | null) => void;
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">No versions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {versions.map((v) => {
        const isSelected = v.id === selectedVersionId;
        const isComparing = v.id === compareVersionId;
        return (
          <div
            key={v.id}
            className={cn(
              "rounded-xl border p-3 transition-colors",
              isSelected ? "border-primary/50 bg-accent-soft" : "border-border"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => onSelectVersion(v.id)} className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Version {v.versionNumber}</span>
                  <DesignVersionStatusBadge status={v.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(v.createdAt)}
                  {v.createdBy?.name ? ` · ${v.createdBy.name}` : ""}
                </p>
                {v.changesSummary && <p className="mt-1 text-sm text-foreground">{v.changesSummary}</p>}
              </button>
              <button
                type="button"
                onClick={() => onToggleCompare(isComparing ? null : v.id)}
                disabled={isSelected}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  isComparing
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {isComparing ? "Comparing" : "Compare"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
