import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { CustomerOrderClient } from "@/features/orders/components/customer/customer-order-client";

export default async function CustomerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireCustomerContext();

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, customerProfileId: true } });
  if (!order || order.customerProfileId !== profile.id) notFound();

  return <CustomerOrderClient orderId={id} />;
}
