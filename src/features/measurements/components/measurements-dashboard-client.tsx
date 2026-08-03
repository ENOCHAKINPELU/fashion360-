"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ListChecks } from "lucide-react";
import { StartMeasurementDialog } from "@/features/measurements/components/start-measurement-dialog";

export function MeasurementsDashboardClient({
  prefilledCustomer,
}: {
  prefilledCustomer?: { id: string; firstName: string; lastName: string; phone: string | null; profilePhotoUrl: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => !!searchParams.get("customerId"));

  function closeAndClearParam(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && searchParams.get("customerId")) {
      router.replace(pathname);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent-soft/50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <Plus className="size-4.5" />
          </div>
          <span className="text-sm font-medium text-foreground">New Measurement</span>
        </button>
        <Link
          href="/dashboard/measurements/browse"
          className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-accent-soft/50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <Search className="size-4.5" />
          </div>
          <span className="text-sm font-medium text-foreground">Search &amp; Browse</span>
        </Link>
        <Link
          href="/dashboard/measurements/templates"
          className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-accent-soft/50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <ListChecks className="size-4.5" />
          </div>
          <span className="text-sm font-medium text-foreground">Manage Templates</span>
        </Link>
      </div>
      <StartMeasurementDialog open={open} onOpenChange={closeAndClearParam} prefilledCustomer={prefilledCustomer} />
    </>
  );
}
