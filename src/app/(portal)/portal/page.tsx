import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalClient } from "./portal-client";

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    include: {
      orders: { orderBy: { createdAt: "desc" } },
      measurements: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { startTime: "asc" } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="font-display text-lg text-foreground">No customer profile yet</p>
        <p className="mt-1 text-sm text-muted">
          Ask your fashion business to link this account to a customer profile.
        </p>
      </div>
    );
  }

  const notifications = await prisma.notification.findMany({
    where: { businessId: customer.businessId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <PortalClient
      data={JSON.parse(
        JSON.stringify({
          name: customer.name,
          orders: customer.orders,
          measurements: customer.measurements,
          appointments: customer.appointments,
          invoices: customer.invoices,
          notifications,
        }),
      )}
    />
  );
}
