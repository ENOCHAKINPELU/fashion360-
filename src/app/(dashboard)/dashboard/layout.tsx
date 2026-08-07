import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageTransition } from "@/shared/components/page-transition";

// This layout's own auth check is a second line of defense — the real
// gate is proxy.ts at the project root, which runs at the Edge before
// any page/layout code. Next.js 16 renamed Middleware to Proxy and only
// recognizes proxy.ts (see node_modules/next/dist/docs/.../16-proxy.md);
// a middleware.ts file is dead code that Next never executes. Past git
// history chased a "stale middleware bundle" theory and repeatedly
// added/restored middleware.ts to fix the SUPER_ADMIN redirect — that
// was a red herring the whole time. Don't recreate middleware.ts; put
// Edge-level auth logic in proxy.ts.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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
