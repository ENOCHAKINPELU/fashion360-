import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Part 19's "Business Profile Completion" — same nudge pattern as the
// customer FashionPassportBanner, no hard gate.
export function BusinessCompletionBanner({
  completionPercent,
  missingItems,
}: {
  completionPercent: number;
  missingItems: { label: string; href: string }[];
}) {
  if (completionPercent >= 100) return null;

  return (
    <Card className="border-none bg-accent-soft shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Your business profile is {completionPercent}% complete</p>
              <p className="text-xs text-muted-foreground">Build your profile and start connecting with customers.</p>
            </div>
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/60">
            <div className="h-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
        {missingItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {missingItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full border border-primary/20 bg-surface px-3 py-1 text-xs font-medium text-primary hover:border-primary/40"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
