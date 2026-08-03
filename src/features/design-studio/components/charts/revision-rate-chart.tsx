"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { RotateCcw } from "lucide-react";

const COLORS = ["var(--chart-1)", "var(--chart-4)"];

export function RevisionRateChart({ withRevisions, withoutRevisions }: { withRevisions: number; withoutRevisions: number }) {
  const total = withRevisions + withoutRevisions;
  if (total === 0) {
    return <EmptyState icon={RotateCcw} title="No design previews yet" className="border-none py-10" />;
  }

  const data = [
    { label: "Needed Revisions", value: withRevisions },
    { label: "Approved First Try", value: withoutRevisions },
  ];

  return (
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
  );
}
