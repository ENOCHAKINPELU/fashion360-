"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentFormDialog } from "@/components/dashboard/appointment-form-dialog";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validations/appointment";

type Appointment = {
  id: string;
  type: keyof typeof APPOINTMENT_TYPE_LABELS;
  status: string;
  startTime: string;
  endTime: string;
  customer: { name: string };
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#a8843f",
  CONFIRMED: "#2f6f4e",
  COMPLETED: "#78716c",
  CANCELLED: "#b23b3b",
  NO_SHOW: "#b8792f",
};

export function AppointmentsClient({
  appointments,
  customers,
}: {
  appointments: Appointment[];
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const events = appointments.map((a) => ({
    id: a.id,
    title: `${a.customer.name} — ${APPOINTMENT_TYPE_LABELS[a.type]}`,
    start: a.startTime,
    end: a.endTime,
    backgroundColor: STATUS_COLORS[a.status] ?? "#a8843f",
    borderColor: "transparent",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Appointments</h1>
          <p className="text-sm text-muted">Consultations, fittings, and pickups on one calendar.</p>
        </div>
        <Button
          onClick={() => {
            setDefaultDate(undefined);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New appointment
        </Button>
      </div>

      <Card className="p-4">
        <div className="fashion360-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek",
            }}
            height="auto"
            events={events}
            dateClick={(info) => {
              setDefaultDate(info.dateStr.slice(0, 10));
              setOpen(true);
            }}
            eventClick={(info) => {
              router.push(`/dashboard/customers?q=${encodeURIComponent(info.event.title.split(" — ")[0])}`);
            }}
          />
        </div>
      </Card>

      <AppointmentFormDialog
        open={open}
        onClose={() => setOpen(false)}
        customers={customers}
        defaultDate={defaultDate}
      />
    </div>
  );
}
