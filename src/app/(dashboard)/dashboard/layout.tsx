import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageTransition } from "@/shared/components/page-transition";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Forces this layout to actually re-evaluate per request rather than
  // risk a cached/prerendered render being reused across different
  // sessions — see src/app/layout.tsx's identical `connection()` call and
  // its commit message ("Defer database-backed rendering until request
  // time") for the precedent this is following in this exact codebase.
  await connection();
  const session = await auth();
  if (!session?.user || !["OWNER", "STAFF", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }
  // SUPER_ADMIN is platform-level and never has a businessId by design —
  // this route group isn't its home (see /admin), but if an admin session
  // ever ends up here directly, sending it through business onboarding
  // (which it can't complete) is the wrong failure mode. Send it to the
  // area it actually belongs in instead.
  if (session.user.role === "SUPER_ADMIN") redirect("/admin");
  if (!session.user.businessId) redirect("/onboarding/business");

  return (
    <div className="min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
