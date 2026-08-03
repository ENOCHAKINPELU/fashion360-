import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MeasurementTemplatesClient } from "@/features/measurements/components/measurement-templates-client";

export default function MeasurementTemplatesPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/measurements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to Measurements
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Measurement Templates</h1>
        <p className="text-sm text-muted-foreground">Manage reusable field sets for manual measurement sessions.</p>
      </div>

      <MeasurementTemplatesClient />
    </div>
  );
}
