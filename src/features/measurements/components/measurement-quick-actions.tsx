"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingBag, CalendarClock, FileText, Printer, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MeasurementQuickActions({ measurementId, customerId }: { measurementId: string; customerId: string }) {
  const router = useRouter();

  async function duplicate() {
    try {
      const res = await fetch(`/api/measurements/${measurementId}`, { headers: {} });
      const json = await res.json();
      if (!res.ok) throw new Error("Could not load measurement");
      const m = json.measurement;
      const createRes = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          profileId: m.profileId,
          templateId: m.templateId ?? undefined,
          unit: m.unit,
          values: m.values,
          fitPreference: m.fitPreference ?? undefined,
          status: "APPROVED",
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error ?? "Could not duplicate");
      toast.success("Measurement duplicated");
      router.push(`/dashboard/measurements/${createJson.measurement.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/dashboard/orders/new?customerId=${customerId}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
      >
        <ShoppingBag className="size-3.5" /> Create Order
      </Link>
      <Link
        href={`/dashboard/appointments?customerId=${customerId}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
      >
        <CalendarClock className="size-3.5" /> Book Fitting
      </Link>
      <Link
        href={`/dashboard/quotations?customerId=${customerId}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent-soft"
      >
        <FileText className="size-3.5" /> Generate Quote
      </Link>
      <Button variant="outline" size="sm" onClick={duplicate} className="gap-1.5">
        <Copy className="size-3.5" /> Duplicate
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
        <Printer className="size-3.5" /> Print Sheet
      </Button>
      <a href={`/api/measurements/${measurementId}/pdf`} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="size-3.5" /> Export PDF
        </Button>
      </a>
    </div>
  );
}
