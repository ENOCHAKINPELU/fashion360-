import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, DesignPreviewStatus } from "@prisma/client";
import { DesignDashboardStats } from "@/features/design-studio/components/design-dashboard-stats";
import { DesignStudioCharts } from "@/features/design-studio/components/design-studio-charts";
import { DesignPreviewsPageClient } from "@/features/design-studio/components/design-previews-page-client";

const PAGE_SIZE = 20;

export default async function DesignStudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  const search = params.search?.trim();
  const status = params.status as DesignPreviewStatus | undefined;
  const orderId = params.orderId;
  const customerId = params.customerId;
  const sort = params.sort ?? "updatedAt:desc";
  const page = Math.max(1, Number(params.page ?? 1));

  const where: Prisma.DesignPreviewWhereInput = {
    businessId,
    // Phase 5 pre-order Design Projects (orderId null) live in
    // /dashboard/design-projects instead — this list stays order-anchored.
    orderId: { not: null },
    ...(status ? { status } : {}),
    ...(orderId ? { orderId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { previewCode: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { order: { orderCode: { contains: search, mode: "insensitive" } } },
            { customer: { firstName: { contains: search, mode: "insensitive" } } },
            { customer: { lastName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];
  const orderBy: Prisma.DesignPreviewOrderByWithRelationInput = { [sortField]: sortDir };

  const [previews, total] = await Promise.all([
    prisma.designPreview.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        order: { select: { id: true, orderCode: true, totalValue: true, expectedCompletionDate: true } },
        customer: {
          select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
        },
      },
    }),
    prisma.designPreview.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">3D Studio</h1>
        <p className="text-sm text-muted-foreground">
          Visualize designs, gather customer feedback, and lock approved versions before production.
        </p>
      </div>

      <DesignDashboardStats businessId={businessId} />
      <DesignStudioCharts businessId={businessId} />

      <DesignPreviewsPageClient
        previews={JSON.parse(JSON.stringify(previews))}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }}
      />
    </div>
  );
}
