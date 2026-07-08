import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderDetailClient } from "./order-detail-client";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, businessId },
    include: {
      customer: { select: { id: true, name: true } },
      designApprovals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  return <OrderDetailClient order={JSON.parse(JSON.stringify(order))} />;
}
