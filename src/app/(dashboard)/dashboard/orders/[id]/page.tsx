import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ORDER_DETAIL_INCLUDE } from "@/app/api/orders/[id]/route";
import { OrderDetailClient } from "@/features/orders/components/order-detail-client";
import type { OrderDetailData } from "@/features/orders/types";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const order = await prisma.order.findFirst({
    where: { id, businessId },
    include: ORDER_DETAIL_INCLUDE,
  });

  if (!order) notFound();

  const serialized = JSON.parse(JSON.stringify(order)) as OrderDetailData;

  return <OrderDetailClient order={serialized} />;
}
