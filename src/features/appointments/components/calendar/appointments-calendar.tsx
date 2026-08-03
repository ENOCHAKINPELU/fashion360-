"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventClickArg, DateSelectArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppointmentFormDialog } from "@/features/appointments/components/appointment-form-dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { AppointmentListItem } from "@/features/appointments/types";

type WorkingHours = Record<string, { open: string; close: string; closed: boolean }>;

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const VIEW_OPTIONS = [
  { value: "timeGridDay", label: "Day" },
  { value: "timeGridWeek", label: "Week" },
  { value: "dayGridMonth", label: "Month" },
  { value: "listWeek", label: "Agenda" },
];

export function AppointmentsCalendar({
  workingHours,
  blockedDates,
}: {
  workingHours: WorkingHours | null;
  blockedDates: { date: string; endDate: string | null; reason: string | null }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calendarRef = useRef<FullCalendar>(null);

  const [view, setView] = useState(() => (searchParams.get("date") ? "timeGridDay" : "timeGridWeek"));
  const [title, setTitle] = useState("");
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<Date | undefined>();

  const businessHours = useMemo(
    () =>
      Object.entries(workingHours ?? {})
        .filter(([, v]) => !v.closed)
        .map(([day, v]) => ({ daysOfWeek: [WEEKDAY_INDEX[day]], startTime: v.open, endTime: v.close })),
    [workingHours]
  );

  const backgroundEvents = useMemo(
    () =>
      blockedDates.map((b) => ({
        start: b.date,
        end: b.endDate ?? undefined,
        allDay: true,
        display: "background",
        color: "var(--danger)",
        title: b.reason ?? "Blocked",
      })),
    [blockedDates]
  );

  function toCalendarEvents(appointments: AppointmentListItem[]) {
    return appointments.map((a) => ({
      id: a.id,
      title: `${a.customer.firstName} ${a.customer.lastName}`,
      start: a.startTime,
      end: a.endTime,
      backgroundColor: a.type.color,
      borderColor: a.type.color,
      textColor: "#ffffff",
      extendedProps: { status: a.status, typeName: a.type.name },
    }));
  }

  // Used by event handlers (button clicks, dialog onSaved) — fine to set
  // state synchronously since it never runs directly inside an effect body.
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments");
      const data: { appointments: AppointmentListItem[] } = await res.json();
      setEvents([...toCalendarEvents(data.appointments ?? []), ...backgroundEvents]);
    } catch {
      toast.error("Could not load appointments");
    } finally {
      setLoading(false);
    }
  }, [backgroundEvents]);

  // Initial fetch on mount, written in the pattern react.dev recommends for
  // data fetching in effects: an inline async function whose setState calls
  // only ever run after an await, with a cleanup flag to avoid stale writes.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/appointments");
        const data: { appointments: AppointmentListItem[] } = await res.json();
        if (!ignore) setEvents([...toCalendarEvents(data.appointments ?? []), ...backgroundEvents]);
      } catch {
        if (!ignore) toast.error("Could not load appointments");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [backgroundEvents]);

  useEffect(() => {
    // Imperative FullCalendar API call, not React state — safe in an effect.
    const dateParam = searchParams.get("date");
    if (dateParam && calendarRef.current) {
      calendarRef.current.getApi().gotoDate(dateParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeView(next: string) {
    setView(next);
    calendarRef.current?.getApi().changeView(next);
  }

  function navigate(direction: "prev" | "next" | "today") {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (direction === "prev") api.prev();
    else if (direction === "next") api.next();
    else api.today();
    setTitle(api.view.title);
  }

  async function handleEventDrop(arg: EventDropArg) {
    const { event } = arg;
    const start = event.start!;
    const end = event.end ?? new Date(start.getTime() + 60 * 60_000);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);

    const res = await fetch(`/api/appointments/${event.id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: start.toISOString().slice(0, 10),
        time: start.toTimeString().slice(0, 5),
        durationMinutes,
        notifyCustomer: false,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not move appointment");
      arg.revert();
      return;
    }
    toast.success("Appointment moved");
  }

  async function handleEventResize(arg: EventResizeDoneArg) {
    const { event } = arg;
    const start = event.start!;
    const end = event.end!;
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);

    const res = await fetch(`/api/appointments/${event.id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: start.toISOString().slice(0, 10),
        time: start.toTimeString().slice(0, 5),
        durationMinutes,
        notifyCustomer: false,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not resize appointment");
      arg.revert();
      return;
    }
    toast.success("Duration updated");
  }

  function handleEventClick(arg: EventClickArg) {
    if (arg.event.display === "background") return;
    router.push(`/dashboard/appointments/${arg.event.id}`);
  }

  function handleSelect(arg: DateSelectArg) {
    setPrefillDate(arg.start);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => navigate("prev")}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("today")}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => navigate("next")}>
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="ml-2 text-base font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={changeView}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setPrefillDate(undefined);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" /> New Appointment
          </Button>
        </div>
      </div>

      <div className={loading ? "opacity-60" : ""}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          height="auto"
          events={events}
          businessHours={businessHours.length ? businessHours : undefined}
          selectable
          editable
          eventResizableFromStart
          select={handleSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          datesSet={(arg) => setTitle(arg.view.title)}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          nowIndicator
          firstDay={1}
        />
      </div>

      <AppointmentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={prefillDate}
        onSaved={() => loadEvents()}
      />
    </div>
  );
}
