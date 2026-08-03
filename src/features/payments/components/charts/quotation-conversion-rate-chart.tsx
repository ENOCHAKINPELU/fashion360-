"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { Percent } from "lucide-react";

const COLORS = ["var(--success)", "var(--danger)", "var(--muted-foreground)"];

export function QuotationConversionRateChart({
  converted,
  declined,
  pending,
}: {
  converted: number;
  declined: number;
  pending: number;
}) {
  const total = converted + declined + pending;
  if (total === 0) {
    return <EmptyState icon={Percent} title="No quotations sent yet" className="border-none py-10" />;
  }

  const data = [
    { label: "Converted", value: converted },
    { label: "Declined", value: declined },
    { label: "Pending", value: pending },
  ];
  const rate = Math.round((converted / total) * 100);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={80} paddingAngle={2}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => <span style={{ color: "var(--foreground)", fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[72px] text-center">
        <p className="text-2xl font-semibold text-foreground">{rate}%</p>
        <p className="text-xs text-muted-foreground">Conversion Rate</p>
      </div>
    </div>
  );
}
