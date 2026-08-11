import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

// Deliberately distinct from EmptyState: EmptyState means "this feature is
// real, there's just no data in it yet." This means the feature itself
// isn't built — it must never be confused with real data, and must never
// be paired with fabricated numbers or fake rows pretending otherwise (see
// AGENTS.md Admin brief §3, §9-10).
export function AdminComingSoon({ icon: Icon = Construction, title, description }: { icon?: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {description ?? "This section is coming in a later Admin phase."}
        </p>
      </div>
    </div>
  );
}
