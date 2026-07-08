import { auth } from "@/lib/auth";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Breadcrumb } from "@/shared/components/breadcrumb";
import { SearchInput } from "@/shared/components/search-input";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ProfileMenu } from "@/components/layout/profile-menu";

export async function Topbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-sm sm:px-6">
      <MobileSidebar />
      <div className="hidden lg:block">
        <Breadcrumb />
      </div>
      <div className="ml-auto flex flex-1 items-center justify-end gap-3 sm:flex-none">
        <SearchInput placeholder="Search Fashion360..." className="hidden w-64 sm:block" />
        <NotificationBell />
        <ProfileMenu
          name={session?.user?.name}
          email={session?.user?.email}
          image={session?.user?.image}
        />
      </div>
    </header>
  );
}
