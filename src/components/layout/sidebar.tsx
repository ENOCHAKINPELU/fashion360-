import Link from "next/link";
import { Logo } from "@/shared/components/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-white lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="text-white">
          <Logo />
        </Link>
      </div>
      <SidebarNav />
      <div className="border-t border-sidebar-border p-4 text-xs text-white/40">
        Fashion360 &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
