import { prisma } from "@/lib/prisma";
import { AdminWaitlistClient } from "@/features/admin/components/admin-waitlist-client";

export default async function AdminWaitlistPage() {
  const [signups, customerCount, designerCount] = await Promise.all([
    prisma.waitlistSignup.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.waitlistSignup.count({ where: { role: "CUSTOMER" } }),
    prisma.waitlistSignup.count({ where: { role: "DESIGNER" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Waitlist</h1>
        <p className="text-sm text-muted-foreground">Signups from the landing page, updating automatically.</p>
      </div>
      <AdminWaitlistClient
        initialSignups={JSON.parse(JSON.stringify(signups))}
        initialCustomerCount={customerCount}
        initialDesignerCount={designerCount}
      />
    </div>
  );
}
