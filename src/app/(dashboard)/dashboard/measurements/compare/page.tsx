import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { GitCompare } from "lucide-react";
import { ComparisonTable } from "@/features/measurements/components/comparison-table";
import { formatDate } from "@/lib/utils";

export default async function MeasurementComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const session = await auth();
  const businessId = session!.user.businessId!;
  const ids = (idsParam ?? "").split(",").filter(Boolean);

  if (ids.length < 2) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Select at least 2 measurements to compare"
        description="Open a measurement profile and choose two or more snapshots to compare."
      />
    );
  }

  const measurements = await prisma.measurement.findMany({
    where: { id: { in: ids }, businessId },
    orderBy: { createdAt: "asc" },
    include: { profile: { select: { name: true } }, customer: { select: { firstName: true, lastName: true } } },
  });

  if (measurements.length < 2) {
    return <EmptyState icon={GitCompare} title="Measurements not found" />;
  }

  const types = await prisma.measurementType.findMany({ where: { businessId }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const fields = types
    .filter((t) => measurements.some((m) => (m.values as Record<string, number>)[t.key] !== undefined))
    .map((t) => ({ key: t.key, label: t.label, category: t.category }));
  const columns = measurements.map((m) => ({
    id: m.id,
    label: `${m.profile.name} (${formatDate(m.createdAt)})`,
    values: m.values as Record<string, number>,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/measurements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to Measurements
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Measurement Comparison</h1>
          <p className="text-sm text-muted-foreground">
            {measurements[0].customer.firstName} {measurements[0].customer.lastName}
          </p>
        </div>
        <a href={`/api/measurements/compare/pdf?ids=${ids.join(",")}`} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-3.5" /> Export PDF
          </Button>
        </a>
      </div>

      <ComparisonTable fields={fields} columns={columns} />
    </div>
  );
}
