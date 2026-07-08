import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { Building2 } from "lucide-react";

export default async function AdminBusinessesPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { customers: true, orders: true, users: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Businesses</h1>
        <p className="text-sm text-muted">Every fashion business registered on Fashion360.</p>
      </div>

      {businesses.length === 0 ? (
        <EmptyState icon={Building2} title="No businesses yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Customers</th>
                <th className="px-6 py-3 font-medium">Orders</th>
                <th className="px-6 py-3 font-medium">Users</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{b.name}</td>
                  <td className="px-6 py-3">
                    <Badge tone="accent">{b.subscriptionPlan}</Badge>
                  </td>
                  <td className="px-6 py-3 text-muted">{b._count.customers}</td>
                  <td className="px-6 py-3 text-muted">{b._count.orders}</td>
                  <td className="px-6 py-3 text-muted">{b._count.users}</td>
                  <td className="px-6 py-3 text-muted">{formatDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
