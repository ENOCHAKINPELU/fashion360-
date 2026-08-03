import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MeasurementsBrowseClient } from "@/features/measurements/components/measurements-browse-client";

export default function MeasurementsBrowsePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/measurements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to Measurements
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Browse Measurements</h1>
        <p className="text-sm text-muted-foreground">Find saved snapshots, open profiles, and compare records.</p>
      </div>

      <MeasurementsBrowseClient />
    </div>
  );
}
