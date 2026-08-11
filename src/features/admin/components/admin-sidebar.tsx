import Link from "next/link";
import { Logo } from "@/shared/components/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

// Mirrors components/layout/sidebar.tsx exactly (same fixed-left, same
// width, same sidebar tokens) — the established shell pattern, not a new
// one, per the brief's instruction to reuse the existing visual identity.
export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-white lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Link href="/admin" className="flex items-center gap-2 text-white">
          <Logo mark />
          <span className="text-sm font-semibold">Admin</span>
        </Link>
      </div>
      <SidebarNav variant="admin" />
      <div className="border-t border-sidebar-border p-4 text-xs text-white/40">
        Fashion360 Admin &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
