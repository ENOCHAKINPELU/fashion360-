import { auth } from "@/lib/auth";
import { AdminMobileSidebar } from "@/features/admin/components/admin-mobile-sidebar";
import { Breadcrumb } from "@/shared/components/breadcrumb";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AdminProfileMenu } from "@/features/admin/components/admin-profile-menu";

// Mirrors components/layout/topbar.tsx — same structure (mobile trigger,
// breadcrumb, contextual controls, notifications, profile), admin nav/menu
// swapped in. No search box: nothing under /admin is searchable yet in
// Phase 1 (the business topbar's search targets its own dashboard data,
// which doesn't have an admin equivalent here).
export async function AdminTopbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-sm sm:px-6">
      <AdminMobileSidebar />
      <div className="hidden lg:block">
        <Breadcrumb variant="admin" />
      </div>
      <div className="ml-auto flex flex-1 items-center justify-end gap-3 sm:flex-none">
        <NotificationBell />
        <AdminProfileMenu name={session?.user?.name} email={session?.user?.email} image={session?.user?.image} />
      </div>
    </header>
  );
}
