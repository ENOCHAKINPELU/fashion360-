import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CustomerSidebar } from "@/components/layout/customer-sidebar";
import { CustomerTopbar } from "@/components/layout/customer-topbar";
import { PageTransition } from "@/shared/components/page-transition";

// Mirrors the business dashboard layout's shape exactly (defense-in-depth
// alongside proxy.ts's middleware gate — never rely on the frontend/
// middleware alone for authorization).
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <CustomerSidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <CustomerTopbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
