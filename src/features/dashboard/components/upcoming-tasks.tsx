import { CalendarClock } from "lucide-react";

const MOCK_TASKS = [
  { title: "Fitting session — Amara Chukwu", when: "Tomorrow, 10:00 AM" },
  { title: "Design approval due — Order #FN-2201", when: "Wed, 2:00 PM" },
  { title: "Fabric delivery follow-up", when: "Thu, 9:00 AM" },
  { title: "Consultation — Bola Adeyemi", when: "Fri, 11:30 AM" },
];

export function UpcomingTasks() {
  return (
    <ul className="space-y-3">
      {MOCK_TASKS.map((task) => (
        <li key={task.title} className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <CalendarClock className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
            <p className="text-xs text-muted-foreground">{task.when}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
