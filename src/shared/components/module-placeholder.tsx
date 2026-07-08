import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-surface px-6 py-20 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description ?? "This module is being crafted for an upcoming phase of Fashion360."}
        </p>
      </div>
      <Badge className="gap-1.5 bg-accent-soft text-primary hover:bg-accent-soft">
        <Sparkles className="size-3.5" aria-hidden="true" />
        Coming in a future phase
      </Badge>
    </div>
  );
}
