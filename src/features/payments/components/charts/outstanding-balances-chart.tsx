"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { Clock } from "lucide-react";

const COLORS = ["var(--success)", "var(--warning)", "var(--chart-3)", "var(--danger)"];

// Buckets outstanding invoice balances by how overdue they are — a standard
// accounts-receivable aging view.
export function OutstandingBalancesChart({
  data,
  currency,
}: {
  data: { label: string; value: number }[];
  currency: string;
}) {
  if (data.every((d) => d.value === 0)) {
    return <EmptyState icon={Clock} title="No outstanding balances" className="border-none py-10" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} width={0} hide />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, "Outstanding"]}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
