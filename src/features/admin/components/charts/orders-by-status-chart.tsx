"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ListOrdered } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";

// Status tokens, not a generated categorical ramp — each bucket's color
// already means something specific everywhere else in Admin (warning =
// needs eyes, success = done, danger = trouble), and the dataviz skill's
// own rule is "status tokens only when the color means good/bad." `token`
// crosses the Server-to-Client boundary as a plain string (never the
// CSS var itself, and never a component reference) — see admin-dashboard.ts.
const TOKEN_COLOR: Record<string, string> = {
  muted: "var(--muted-foreground)",
  info: "var(--info)",
  warning: "var(--warning)",
  success: "var(--success)",
  danger: "var(--danger)",
};

export function OrdersByStatusChart({ data }: { data: { label: string; token: string; count: number }[] }) {
  if (data.every((d) => d.count === 0)) {
    return <EmptyState icon={ListOrdered} title="No orders yet" description="Orders will appear here as customers place them." className="border-none py-10" />;
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }} barCategoryGap={12}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={92} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => [Number(value).toLocaleString(), "Orders"]}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d) => (
            <Cell key={d.label} fill={TOKEN_COLOR[d.token] ?? "var(--primary)"} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
