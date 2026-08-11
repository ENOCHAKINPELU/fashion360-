import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { History } from "lucide-react";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 30;

// The Phase 1 "Audit Log Foundation" (see AGENTS.md Admin brief §17) — the
// data layer (AuditLog model, logAuditEvent(), and /api/audit-logs's own
// SUPER_ADMIN-sees-everything branch) already existed and needed no
// changes; this is the page that was missing to actually look at it.
// Platform-wide (every business, every user), read-only — moderation
// actions on what it shows belong to later phases, same as every other
// Phase 1 page.
export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } }, business: { select: { name: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Every recorded login, registration, and admin action across the platform ({total} total).
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={History} title="No admin activity yet" description="Actions like logins, registrations, and admin decisions will appear here as Fashion360 activity grows." />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="border-none shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                    {log.user && <p className="text-sm text-foreground">{log.user.name ?? log.user.email}</p>}
                    {log.business && <p className="text-xs text-muted-foreground">on {log.business.name}</p>}
                  </div>
                  {log.entityType && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId}` : ""}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
