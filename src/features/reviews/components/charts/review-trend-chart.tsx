"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ReviewTrendChart({ data, domain, formatValue }: { data: { label: string; value: number }[]; domain?: [number, number]; formatValue?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="reviewTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        {domain && <YAxis domain={domain} hide />}
        <Tooltip
          cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
          formatter={(value) => [formatValue ? formatValue(Number(value)) : value, ""]}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} fill="url(#reviewTrendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
