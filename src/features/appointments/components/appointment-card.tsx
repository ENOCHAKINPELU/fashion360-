import Link from "next/link";
import { Clock, MapPin, User as UserIcon } from "lucide-react";
import { UserAvatar } from "@/shared/components/user-avatar";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import type { AppointmentListItem } from "@/features/appointments/types";

export function AppointmentCard({ appointment }: { appointment: AppointmentListItem }) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const timeLabel = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <Link
      href={`/dashboard/appointments/${appointment.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/40 hover:bg-accent-soft/40"
    >
      <span className="h-full min-h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: appointment.type.color }} />
      <UserAvatar
        name={`${appointment.customer.firstName} ${appointment.customer.lastName}`}
        image={appointment.customer.profilePhotoUrl}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {appointment.customer.firstName} {appointment.customer.lastName}
          </p>
          <AppointmentStatusBadge status={appointment.status} className="shrink-0" />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {timeLabel}
          </span>
          <span>{appointment.type.name}</span>
          {appointment.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {appointment.location}
            </span>
          )}
          {appointment.assignedStaff && (
            <span className="flex items-center gap-1">
              <UserIcon className="size-3" /> {appointment.assignedStaff.name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
