"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { Ruler } from "lucide-react";
import { MeasurementStatusBadge, MeasurementSourceBadge } from "@/features/measurements/components/measurement-status-badge";
import { formatDate } from "@/lib/utils";
import type { MeasurementRecordItem } from "@/features/measurements/types";

export function ProfileMeasurementsList({ measurements }: { measurements: MeasurementRecordItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function compare() {
    router.push(`/dashboard/measurements/compare?ids=${Array.from(selected).join(",")}`);
  }

  if (measurements.length === 0) {
    return <EmptyState icon={Ruler} title="No measurements in this profile yet" className="border-none py-10" />;
  }

  return (
    <div className="space-y-3">
      {selected.size >= 2 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-accent-soft px-4 py-2.5">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <Button size="sm" onClick={compare} className="gap-1.5">
            <GitCompare className="size-3.5" /> Compare
          </Button>
        </div>
      )}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {measurements.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3">
            <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} aria-label="Select for comparison" />
            <Link href={`/dashboard/measurements/${m.id}`} className="flex flex-1 items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{formatDate(m.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="text-xs text-muted-foreground">{Object.keys(m.values).length} fields recorded</p>
              </div>
              <div className="flex items-center gap-2">
                <MeasurementSourceBadge source={m.source} />
                <MeasurementStatusBadge status={m.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
