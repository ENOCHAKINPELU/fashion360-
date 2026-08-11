import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/auth.config";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminTopbar } from "@/features/admin/components/admin-topbar";
import { PageTransition } from "@/shared/components/page-transition";

// This layout's own check is the SECOND line of defense, not the first —
// the real gate is proxy.ts at the Edge, which now covers /admin/:path*
// and redirects a signed-in non-admin to /unauthorized before any admin
// code runs at all (see proxy.ts's comment on why that redirect goes
// through a real message page instead of silently teleporting them). This
// stays as a safety net for the same reason (dashboard)/dashboard/layout.tsx
// keeps its own check: defense-in-depth, not redundancy.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect(homeFor(session.user.role));

  return (
    <div className="min-h-screen w-full bg-background">
      <AdminSidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <AdminTopbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
