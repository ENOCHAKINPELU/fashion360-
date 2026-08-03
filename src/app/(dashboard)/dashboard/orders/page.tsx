import Link from "next/link";
import { Kanban } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import type { Prisma, OrderStatus, OrderPaymentStatus, OrderType, OrderPriority } from "@prisma/client";
import { OrderDashboardStats } from "@/features/orders/components/order-dashboard-stats";
import { OrderCharts } from "@/features/orders/components/order-charts";
import { OrdersPageClient } from "@/features/orders/components/orders-page-client";

const PAGE_SIZE = 20;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  const search = params.search?.trim();
  const status = params.status as OrderStatus | undefined;
  const paymentStatus = params.paymentStatus as OrderPaymentStatus | undefined;
  const orderType = params.orderType as OrderType | undefined;
  const priority = params.priority as OrderPriority | undefined;
  const customerId = params.customerId;
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;
  const archived = params.archived === "true";
  const sort = params.sort ?? "orderDate:desc";
  const page = Math.max(1, Number(params.page ?? 1));

  const where: Prisma.OrderWhereInput = {
    businessId,
    isArchived: archived,
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(orderType ? { orderType } : {}),
    ...(priority ? { priority } : {}),
    ...(customerId ? { customerId } : {}),
    ...(dateFrom || dateTo
      ? {
          orderDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { orderCode: { contains: search, mode: "insensitive" } },
            { customer: { firstName: { contains: search, mode: "insensitive" } } },
            { customer: { lastName: { contains: search, mode: "insensitive" } } },
            { customer: { phone: { contains: search, mode: "insensitive" } } },
            { customer: { email: { contains: search, mode: "insensitive" } } },
            { items: { some: { designNameSnapshot: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];
  const orderBy: Prisma.OrderOrderByWithRelationInput = { [sortField]: sortDir };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
        },
        assignedDesigner: { select: { id: true, name: true, image: true } },
        items: { select: { designNameSnapshot: true, designCategorySnapshot: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage every order from consultation through delivery.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/dashboard/orders/board">
            <Kanban className="size-4" /> Production Board
          </Link>
        </Button>
      </div>

      <OrderDashboardStats businessId={businessId} />
      <OrderCharts businessId={businessId} />

      <OrdersPageClient
        orders={JSON.parse(JSON.stringify(orders))}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }}
      />
    </div>
  );
}
