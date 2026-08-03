import { CheckCircle2, Circle } from "lucide-react";
import type { JourneyStep } from "@/lib/customer-journey";
import { cn } from "@/lib/utils";

export function JourneyTracker({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex items-start gap-3">
          {i !== steps.length - 1 && <span className="absolute top-5 left-[9px] h-full w-px bg-border" aria-hidden="true" />}
          {step.state === "complete" ? (
            <CheckCircle2 className="relative z-10 mt-0.5 size-[18px] shrink-0 text-success" />
          ) : step.state === "current" ? (
            <span className="relative z-10 mt-1 flex size-[18px] shrink-0 items-center justify-center">
              <span className="size-2.5 animate-pulse rounded-full bg-primary" />
            </span>
          ) : (
            <Circle className="relative z-10 mt-0.5 size-[18px] shrink-0 text-muted-foreground/40" />
          )}
          <span
            className={cn(
              "text-sm",
              step.state === "complete" ? "text-foreground" : step.state === "current" ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
