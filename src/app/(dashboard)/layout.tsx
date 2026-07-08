import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !session.user.businessId) redirect("/sign-in");

  const business = await prisma.business.findUnique({ where: { id: session.user.businessId } });
  if (!business) redirect("/sign-in");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar businessName={business.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={session.user.name || session.user.email || "User"} />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
