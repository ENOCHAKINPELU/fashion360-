import { Bell } from "lucide-react";
import { AdminComingSoon } from "@/features/admin/components/admin-coming-soon";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">Admin notification center.</p>
      </div>
      <AdminComingSoon
        icon={Bell}
        title="A dedicated notification center is coming in a later Admin phase"
        description="Your notifications are already available from the bell icon above. This page will bring history, filtering, and platform-wide alerts in a dedicated later phase."
      />
    </div>
  );
}
