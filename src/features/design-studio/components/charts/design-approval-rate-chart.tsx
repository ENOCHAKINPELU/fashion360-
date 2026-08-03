"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { CheckCircle2 } from "lucide-react";

const COLORS = ["var(--success)", "var(--danger)"];

export function DesignApprovalRateChart({ approved, rejected }: { approved: number; rejected: number }) {
  const total = approved + rejected;
  if (total === 0) {
    return <EmptyState icon={CheckCircle2} title="No decisions recorded yet" className="border-none py-10" />;
  }

  const data = [
    { label: "Approved", value: approved },
    { label: "Rejected", value: rejected },
  ];
  const rate = Math.round((approved / total) * 100);

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
        <p className="text-xs text-muted-foreground">Approval Rate</p>
      </div>
    </div>
  );
}
