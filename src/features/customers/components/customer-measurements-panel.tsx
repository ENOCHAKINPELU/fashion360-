"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingState } from "@/shared/components/loading-state";
import { formatDate } from "@/lib/utils";

interface MeasurementRow {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  profile: { id: string; name: string } | null;
  template: { id: string; name: string } | null;
}

export function CustomerMeasurementsPanel({ customerId }: { customerId: string }) {
  const [measurements, setMeasurements] = useState<MeasurementRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/measurements?customerId=${customerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMeasurements(data.measurements ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Measurements</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/measurements?customerId=${customerId}`}>View All</Link>
        </Button>
      </div>

      {measurements === null ? (
        <LoadingState />
      ) : measurements.length === 0 ? (
        <EmptyState icon={Ruler} title="No measurements recorded" description="This customer has no saved measurements yet." className="border-none py-8" />
      ) : (
        <ul className="space-y-2">
          {measurements.slice(0, 10).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{m.profile?.name ?? m.template?.name ?? "Measurement"}</p>
                  <Badge variant="outline" className="capitalize">{m.status.toLowerCase().replace(/_/g, " ")}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{formatDate(m.createdAt)} · {m.source.toLowerCase()}</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/measurements/${m.id}`}>View</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
