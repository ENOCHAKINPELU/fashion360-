import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getAdminNotificationDetail } from "@/lib/admin-notifications";
import { RetryNotificationButton } from "@/features/admin/components/admin-notification-actions";

const STATUS_BADGE: Record<string, string> = {
  QUEUED: "bg-muted text-muted-foreground",
  PROCESSING: "bg-info-soft text-info",
  SENT: "bg-success-soft text-success",
  DELIVERED: "bg-success-soft text-success",
  READ: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  EXPIRED: "bg-muted text-muted-foreground",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export default async function AdminNotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notification = await getAdminNotificationDetail(id);
  if (!notification) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/notifications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Notifications
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{notification.title}</h1>
          <p className="font-mono text-xs text-muted-foreground">{notification.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_BADGE[notification.status] ?? "bg-muted text-muted-foreground"}>{notification.status}</Badge>
          {notification.status === "FAILED" && <RetryNotificationButton notificationLogId={notification.id} />}
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Recipient" value={notification.recipientName ?? "—"} />
          <Field label="Recipient Email" value={notification.recipientEmail ?? "—"} />
          <Field label="Recipient Type" value={notification.recipientType ?? "—"} />
          <Field label="Channel" value={notification.channel.replace(/_/g, " ")} />
          <Field label="Triggered Event" value={notification.event.replace(/_/g, " ")} />
          <Field label="Delivery Attempts" value={notification.deliveryAttempts} />
          <Field label="Sent Timestamp" value={notification.sentAt ? formatDate(notification.sentAt) : "—"} />
          <Field label="Read Timestamp" value={notification.readAt ? formatDate(notification.readAt) : "—"} />
          <Field label="Created" value={formatDate(notification.createdAt)} />
          {notification.broadcast && (
            <Field
              label="Part of Broadcast"
              value={
                <Link href={`/admin/notifications?tab=broadcasts`} className="text-primary hover:underline">
                  {notification.broadcast.title}
                </Link>
              }
            />
          )}
          {notification.orderId && <Field label="Order" value={<Link href={`/admin/orders/${notification.orderId}`} className="text-primary hover:underline">{notification.orderId}</Link>} />}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Message Body</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{notification.body}</p>
        </CardContent>
      </Card>

      {notification.status === "FAILED" && notification.failureReason && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-2">
            <p className="text-xs font-medium text-danger uppercase">Failure Reason</p>
            <p className="text-sm text-foreground">{notification.failureReason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
