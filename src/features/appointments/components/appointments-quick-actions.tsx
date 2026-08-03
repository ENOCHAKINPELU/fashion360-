"use client";

import Link from "next/link";
import { CalendarPlus, CalendarDays, Settings2, UserPlus } from "lucide-react";

export function AppointmentsQuickActions({ onNewAppointment, onWalkIn }: { onNewAppointment: () => void; onWalkIn: () => void }) {
  const actions = [
    { label: "New Appointment", icon: CalendarPlus, onClick: onNewAppointment },
    { label: "Walk-in Check-in", icon: UserPlus, onClick: onWalkIn },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent-soft/50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <action.icon className="size-4.5" />
          </div>
          <span className="text-sm font-medium text-foreground">{action.label}</span>
        </button>
      ))}
      <Link
        href="/dashboard/appointments/calendar"
        className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-accent-soft/50"
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary">
          <CalendarDays className="size-4.5" />
        </div>
        <span className="text-sm font-medium text-foreground">Open Calendar</span>
      </Link>
      <Link
        href="/dashboard/appointments/availability"
        className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-accent-soft/50"
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary">
          <Settings2 className="size-4.5" />
        </div>
        <span className="text-sm font-medium text-foreground">Availability Settings</span>
      </Link>
    </div>
  );
}
