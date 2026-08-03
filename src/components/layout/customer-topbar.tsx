import { auth } from "@/lib/auth";
import { CustomerMobileSidebar } from "@/components/layout/customer-mobile-sidebar";
import { CustomerProfileMenu } from "@/components/layout/customer-profile-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

// Deliberately lighter than the business Topbar (no breadcrumb, no search) —
// the notification bell reuses the same Notification model/component as the
// business side, scoped to this customer via /api/customer/notifications.
export async function CustomerTopbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-sm sm:px-6">
      <CustomerMobileSidebar />
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell apiBase="/api/customer/notifications" />
        <CustomerProfileMenu name={session?.user?.name} email={session?.user?.email} image={session?.user?.image} />
      </div>
    </header>
  );
}
