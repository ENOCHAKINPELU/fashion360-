import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomerDetailClient } from "./customer-detail-client";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      measurements: { orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { startTime: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) notFound();

  return (
    <CustomerDetailClient
      customer={JSON.parse(JSON.stringify(customer))}
    />
  );
}
