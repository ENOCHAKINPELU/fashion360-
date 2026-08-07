"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingState } from "@/shared/components/loading-state";
import { formatDate } from "@/lib/utils";
import type { AppointmentListItem } from "@/features/appointments/types";

export function CustomerAppointmentsPanel({ customerId }: { customerId: string }) {
  const [appointments, setAppointments] = useState<AppointmentListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/appointments?customerId=${customerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAppointments(data.appointments ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Appointments</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/appointments?customerId=${customerId}`}>View All</Link>
        </Button>
      </div>

      {appointments === null ? (
        <LoadingState />
      ) : appointments.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No appointments" description="This customer has no upcoming or past appointments." className="border-none py-8" />
      ) : (
        <ul className="space-y-2">
          {appointments.slice(0, 10).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{a.type.name}</p>
                  <Badge variant="outline" className="capitalize">{a.status.toLowerCase().replace(/_/g, " ")}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{formatDate(a.startTime)}{a.location ? ` · ${a.location}` : ""}</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/appointments/${a.id}`}>View</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
