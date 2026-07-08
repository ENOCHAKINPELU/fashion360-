import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const { new: isNew } = await searchParams;

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      where: { businessId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <OrdersClient
      orders={JSON.parse(JSON.stringify(orders))}
      customers={customers}
      autoOpen={isNew === "1"}
    />
  );
}
