import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 px-5">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.direction === "up" ? "text-success" : "text-danger"
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend.value}
            </p>
          )}
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
