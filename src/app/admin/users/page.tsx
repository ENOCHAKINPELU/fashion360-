import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { Users } from "lucide-react";

const ROLE_TONE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger" | "info"> = {
  SUPER_ADMIN: "danger",
  OWNER: "accent",
  STAFF: "info",
  CUSTOMER: "neutral",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { business: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Users</h1>
        <p className="text-sm text-muted">Every account across every business.</p>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{u.name || "—"}</td>
                  <td className="px-6 py-3 text-muted">{u.email}</td>
                  <td className="px-6 py-3">
                    <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="px-6 py-3 text-muted">{u.business?.name || "—"}</td>
                  <td className="px-6 py-3 text-muted">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
