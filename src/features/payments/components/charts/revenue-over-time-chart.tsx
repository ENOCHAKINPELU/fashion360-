"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { TrendingUp } from "lucide-react";

export function RevenueOverTimeChart({ data, currency }: { data: { label: string; revenue: number }[]; currency: string }) {
  if (data.every((d) => d.revenue === 0)) {
    return <EmptyState icon={TrendingUp} title="No revenue recorded yet" className="border-none py-10" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="financeRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} width={0} hide />
        <Tooltip
          cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
          formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, "Revenue"]}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#financeRevenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
