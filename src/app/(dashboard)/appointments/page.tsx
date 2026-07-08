import { CalendarClock } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function AppointmentsPage() {
  return (
    <ModulePlaceholder
      icon={CalendarClock}
      title="Appointments"
      description="Book consultations, fittings, and pickups with a full calendar view and automatic reminders."
    />
  );
}
