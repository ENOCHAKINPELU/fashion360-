"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Users, Shirt } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { formatCurrency } from "@/lib/utils";

// One shared single-series area chart for all three "trend over time"
// panels (Revenue, Customer Growth, Designer Growth) rather than three
// near-identical components. `kind` is a plain string discriminator, not a
// function/icon prop — the icon and value-formatting choice both happen
// INSIDE this client module (see the earlier RSC-boundary incident in
// Phase 1's postmortem: a Server Component can't hand a Client Component a
// live function or component reference as a prop, only serializable data).
const EMPTY_ICON = { revenue: TrendingUp, customers: Users, designers: Shirt } as const;

export function TrendAreaChart({
  data,
  kind,
  valueLabel,
  currency,
}: {
  data: { label: string; value: number }[];
  kind: "revenue" | "customers" | "designers";
  valueLabel: string;
  currency?: string;
}) {
  if (data.every((d) => d.value === 0)) {
    return (
      <EmptyState
        icon={EMPTY_ICON[kind]}
        title={`No ${valueLabel.toLowerCase()} yet`}
        description="This chart fills in as platform activity grows."
        className="border-none py-10"
      />
    );
  }

  const format = (value: number) => (kind === "revenue" ? formatCurrency(value, currency ?? "NGN") : value.toLocaleString());
  const gradientId = `trendFill-${kind}`;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <YAxis hide />
        <Tooltip
          cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
          formatter={(value) => [format(Number(value)), valueLabel]}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
