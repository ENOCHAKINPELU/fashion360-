import { cn } from "@/lib/utils";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
        F
      </div>
      {!mark && <span className="text-lg font-semibold tracking-tight">Fashion360</span>}
    </div>
  );
}
