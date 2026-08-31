import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Bell, Clock, Send, PackageCheck, Eye, XCircle, Megaphone, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";
import { getAdminNotificationList, getAdminNotificationStats } from "@/lib/admin-notifications";
import { getAdminBroadcastList, sendDueScheduledBroadcasts } from "@/lib/admin-broadcasts";
import { getAdminSystemAlertList, checkHighDisputeRate } from "@/lib/admin-system-alerts";
import { ensureDefaultTemplates } from "@/lib/notification-templates";
import { prisma } from "@/lib/prisma";
import { RetryNotificationButton, ResolveSystemAlertButton } from "@/features/admin/components/admin-notification-actions";
import { NewBroadcastDialog, SendBroadcastButton, CancelBroadcastButton } from "@/features/admin/components/admin-broadcast-actions";
import { EditTemplateDialog } from "@/features/admin/components/admin-notification-template-form";
import type {
  NotificationChannel,
  NotificationStatus,
  NotificationEvent,
  UserRole,
  BroadcastStatus,
  SystemAlertCategory,
  SystemAlertSeverity,
} from "@prisma/client";

const TABS = [
  { key: "notifications", label: "All Notifications" },
  { key: "broadcasts", label: "Broadcasts" },
  { key: "templates", label: "Templates" },
  { key: "alerts", label: "System Alerts" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const STATUS_BADGE: Record<NotificationStatus, string> = {
  QUEUED: "bg-muted text-muted-foreground",
  PROCESSING: "bg-info-soft text-info",
  SENT: "bg-success-soft text-success",
  DELIVERED: "bg-success-soft text-success",
  READ: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  EXPIRED: "bg-muted text-muted-foreground",
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = { IN_APP: "In-App", EMAIL: "Email", SMS: "SMS", PUSH: "Push" };

const BROADCAST_STATUS_BADGE: Record<BroadcastStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-info-soft text-info",
  SENDING: "bg-warning-soft text-warning",
  SENT: "bg-success-soft text-success",
  CANCELLED: "bg-muted text-muted-foreground",
  FAILED: "bg-danger-soft text-danger",
};

const SEVERITY_BADGE: Record<SystemAlertSeverity, string> = {
  INFO: "bg-info-soft text-info",
  WARNING: "bg-warning-soft text-warning",
  CRITICAL: "bg-danger-soft text-danger",
};

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-foreground">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Admin Phase 10: Notifications & Communication Center. Every section here
// reads real, dispatcher-written data (lib/notification-center.ts,
// lib/admin-notifications.ts, lib/admin-broadcasts.ts,
// lib/admin-system-alerts.ts) — nothing on this page is placeholder or
// fabricated. See the phase report for the full audit + what's covered.
export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key as TabKey) ?? "notifications";

  // Opportunistic sweep — same pattern as the Appointments Dashboard's
  // processDueReminders() call. No persistent job queue exists in this
  // deployment; see lib/admin-broadcasts.ts's sendDueScheduledBroadcasts.
  await Promise.all([sendDueScheduledBroadcasts().catch(() => {}), checkHighDisputeRate().catch(() => {})]);

  const stats = await getAdminNotificationStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">Every notification sent, queued, or failed across the platform — and platform-wide broadcasts.</p>
        </div>
        <NewBroadcastDialog />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard icon={Bell} label="Total" value={stats.total} />
        <StatCard icon={Clock} label="Queued" value={stats.queued} />
        <StatCard icon={Send} label="Sent" value={stats.sent} />
        <StatCard icon={PackageCheck} label="Delivered" value={stats.delivered} />
        <StatCard icon={Eye} label="Read" value={stats.read} />
        <StatCard icon={XCircle} label="Failed" value={stats.failed} />
        <StatCard icon={Megaphone} label="Broadcasts" value={stats.broadcastCampaigns} />
        <StatCard icon={ShieldAlert} label="System Alerts" value={stats.systemAlerts} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/notifications?tab=${t.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "notifications" && <NotificationsTab sp={sp} />}
      {tab === "broadcasts" && <BroadcastsTab sp={sp} />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "alerts" && <AlertsTab sp={sp} />}
    </div>
  );
}

async function NotificationsTab({ sp }: { sp: Record<string, string | undefined> }) {
  const params = {
    q: sp.q,
    channel: sp.channel as NotificationChannel | undefined,
    status: sp.status as NotificationStatus | undefined,
    recipientType: sp.recipientType as UserRole | undefined,
    event: sp.event as NotificationEvent | undefined,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    page: sp.page ? Number(sp.page) : 1,
  };
  const { items, total, page, totalPages } = await getAdminNotificationList(params);
  const hasFilters = !!(params.q || params.channel || params.status || params.recipientType || params.event || params.dateFrom || params.dateTo);

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(sp as Record<string, string>);
    next.set("tab", "notifications");
    next.set("page", String(targetPage));
    return `/admin/notifications?${next.toString()}`;
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <input type="hidden" name="tab" value="notifications" />
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search by notification ID, recipient name, recipient email, or order number..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="channel" defaultValue={params.channel ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All channels</option>
            {(["IN_APP", "EMAIL", "SMS", "PUSH"] as NotificationChannel[]).map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {(["QUEUED", "PROCESSING", "SENT", "DELIVERED", "READ", "FAILED", "EXPIRED"] as NotificationStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="recipientType" defaultValue={params.recipientType ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All recipient types</option>
            {(["CUSTOMER", "OWNER", "STAFF", "SUPER_ADMIN"] as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select name="event" defaultValue={params.event ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All events</option>
            {[
              "CUSTOMER_REGISTERED", "DESIGNER_REGISTERED", "DESIGNER_VERIFIED", "REQUEST_SUBMITTED", "REQUEST_ACCEPTED",
              "ORDER_CREATED", "PAYMENT_RECEIVED", "ESCROW_CREATED", "PRODUCTION_STARTED", "PRODUCTION_COMPLETED",
              "COURIER_ASSIGNED", "SHIPMENT_PICKED_UP", "DELIVERY_COMPLETED", "REVIEW_SUBMITTED", "DISPUTE_OPENED",
              "REFUND_APPROVED", "ACCOUNT_SUSPENDED", "PASSWORD_RESET", "BROADCAST", "SYSTEM",
            ].map((e) => (
              <option key={e} value={e}>
                {e.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="shrink-0 text-xs text-muted-foreground">From</label>
            <input id="dateFrom" type="date" name="dateFrom" defaultValue={params.dateFrom} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dateTo" className="shrink-0 text-xs text-muted-foreground">to</label>
            <input id="dateTo" type="date" name="dateTo" defaultValue={params.dateTo} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">Apply Filters</Button>
            {hasFilters && (
              <Link href="/admin/notifications?tab=notifications" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Clear Filters
              </Link>
            )}
          </div>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications found" description={hasFilters ? "No notifications match your filters." : "Notifications will appear here as platform events happen."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[1300px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Read</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/notifications/${n.id}`} className="font-mono text-xs font-medium text-foreground hover:underline">
                        {n.id.slice(0, 10)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="text-foreground">{n.recipientName ?? "—"}</div>
                      <div>{n.recipientEmail ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{n.recipientType ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{CHANNEL_LABEL[n.channel]}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{n.event.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[n.status]}>{n.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(n.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{n.sentAt ? formatDate(n.sentAt) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{n.readAt ? formatDate(n.readAt) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/notifications/${n.id}`}>
                          <Button size="sm" variant="ghost">View</Button>
                        </Link>
                        {n.status === "FAILED" && <RetryNotificationButton notificationLogId={n.id} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {page} of {totalPages} · {total} notification{total === 1 ? "" : "s"}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={pageHref(page - 1)}><Button size="sm" variant="outline">Previous</Button></Link>}
                {page < totalPages && <Link href={pageHref(page + 1)}><Button size="sm" variant="outline">Next</Button></Link>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function BroadcastsTab({ sp }: { sp: Record<string, string | undefined> }) {
  const { items, total } = await getAdminBroadcastList({ status: sp.status as BroadcastStatus | undefined, page: sp.page ? Number(sp.page) : 1 });

  if (items.length === 0) {
    return <EmptyState icon={Megaphone} title="No broadcasts" description="Platform-wide announcements you create will appear here." />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Scheduled / Sent</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Created By</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{b.title}</div>
                  <div className="max-w-xs truncate text-xs text-muted-foreground">{b.body}</div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{b.target === "SEGMENT" ? b.segment?.replace(/_/g, " ") : b.target.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{CHANNEL_LABEL[b.channel]}</td>
                <td className="px-4 py-3">
                  <Badge className={BROADCAST_STATUS_BADGE[b.status]}>{b.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{b.sentAt ? formatDate(b.sentAt) : b.scheduledFor ? formatDate(b.scheduledFor) : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{b.recipientCount ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{b.createdBy.name ?? b.createdBy.email}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {(b.status === "DRAFT" || b.status === "SCHEDULED") && <SendBroadcastButton broadcastId={b.id} recipientCount={b.recipientCount} />}
                    {(b.status === "DRAFT" || b.status === "SCHEDULED") && <CancelBroadcastButton broadcastId={b.id} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{total} broadcast{total === 1 ? "" : "s"}</p>
    </div>
  );
}

async function TemplatesTab() {
  await ensureDefaultTemplates(prisma);
  const templates = await prisma.notificationTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((t) => (
        <Card key={t.id} className="border-none shadow-sm">
          <CardContent className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Badge className={t.isActive ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}>{t.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="rounded-lg border border-dashed border-border p-2 text-xs">
              <p className="font-medium text-foreground">{t.titleTemplate}</p>
              <p className="text-muted-foreground">{t.bodyTemplate}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{CHANNEL_LABEL[t.channel]} · {t.event?.replace(/_/g, " ") ?? "Any event"}</span>
              <EditTemplateDialog id={t.id} name={t.name} titleTemplate={t.titleTemplate} bodyTemplate={t.bodyTemplate} isActive={t.isActive} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function AlertsTab({ sp }: { sp: Record<string, string | undefined> }) {
  const resolvedParam = sp.resolved;
  const { items, total } = await getAdminSystemAlertList({
    category: sp.category as SystemAlertCategory | undefined,
    severity: sp.severity as SystemAlertSeverity | undefined,
    resolved: resolvedParam === undefined ? false : resolvedParam === "true",
    page: sp.page ? Number(sp.page) : 1,
  });

  if (items.length === 0) {
    return <EmptyState icon={ShieldAlert} title="No system alerts" description="Payment, courier, and other operational failures will appear here." />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Alert</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.category.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <Badge className={SEVERITY_BADGE[a.severity]}>{a.severity}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{a.title}</div>
                  <div className="max-w-md text-xs text-muted-foreground">{a.message}</div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(a.createdAt)}</td>
                <td className="px-4 py-3">
                  {a.resolvedAt ? <Badge className="bg-success-soft text-success">Resolved</Badge> : <Badge className="bg-danger-soft text-danger">Open</Badge>}
                </td>
                <td className="px-4 py-3">{!a.resolvedAt && <ResolveSystemAlertButton alertId={a.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{total} alert{total === 1 ? "" : "s"}</p>
    </div>
  );
}
