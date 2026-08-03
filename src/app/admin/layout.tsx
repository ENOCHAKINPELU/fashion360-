import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Logo } from "@/shared/components/logo";
import { AdminNav } from "@/features/admin/components/admin-nav";

// Platform-wide (not business-scoped) — SUPER_ADMIN only, and deliberately
// doesn't require a businessId (see prisma/seed.ts's platform admin user,
// which has none), unlike the (dashboard) layout it sits alongside.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo mark />
            <span className="text-sm font-semibold text-foreground">Platform Admin</span>
          </Link>
          <span className="text-xs text-muted-foreground">{session.user.email}</span>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
