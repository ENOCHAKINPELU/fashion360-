"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { BarChart3 } from "lucide-react";

export function PaymentsOverTimeChart({ data, currency }: { data: { label: string; amount: number }[]; currency: string }) {
  if (data.every((d) => d.amount === 0)) {
    return <EmptyState icon={BarChart3} title="No payments recorded yet" className="border-none py-10" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} width={0} hide />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, "Payments"]}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--chart-2)" barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
