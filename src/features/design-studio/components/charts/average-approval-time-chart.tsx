"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { Clock } from "lucide-react";

export function AverageApprovalTimeChart({ data }: { data: { label: string; days: number }[] }) {
  const hasData = data.some((d) => d.days > 0);
  if (!hasData) {
    return <EmptyState icon={Clock} title="No approvals recorded yet" className="border-none py-10" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => [`${value} day${value === 1 ? "" : "s"}`, "Avg. Approval Time"]}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
        />
        <Bar dataKey="days" fill="var(--secondary)" radius={[6, 6, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
