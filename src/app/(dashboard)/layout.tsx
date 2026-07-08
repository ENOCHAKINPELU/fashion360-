import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageTransition } from "@/shared/components/page-transition";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !["OWNER", "STAFF", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }
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
