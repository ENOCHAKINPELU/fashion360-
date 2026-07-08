"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const MOCK_REVENUE = [
  { month: "Feb", revenue: 420000 },
  { month: "Mar", revenue: 580000 },
  { month: "Apr", revenue: 510000 },
  { month: "May", revenue: 690000 },
  { month: "Jun", revenue: 740000 },
  { month: "Jul", revenue: 860000 },
];

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={MOCK_REVENUE} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
          formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--popover)",
            fontSize: 13,
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
