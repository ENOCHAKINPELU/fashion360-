import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
  trend?: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
          {trend && <p className="mt-1 text-xs text-success">{trend}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-accent-soft p-2.5 text-accent">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
