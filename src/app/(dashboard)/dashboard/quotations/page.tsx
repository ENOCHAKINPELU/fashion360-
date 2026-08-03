import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, QuotationStatus } from "@prisma/client";
import { QuotationDashboardStats } from "@/features/quotations/components/quotation-dashboard-stats";
import { QuotationsPageClient } from "@/features/quotations/components/quotations-page-client";

const PAGE_SIZE = 20;

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { currency: true } });

  const search = params.search?.trim();
  const status = params.status as QuotationStatus | undefined;
  const orderId = params.orderId;
  const customerId = params.customerId;
  const page = Math.max(1, Number(params.page ?? 1));

  const where: Prisma.QuotationWhereInput = {
    businessId,
    ...(status ? { status } : {}),
    ...(orderId ? { orderId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { quotationNumber: { contains: search, mode: "insensitive" } },
            { order: { orderCode: { contains: search, mode: "insensitive" } } },
            { customer: { firstName: { contains: search, mode: "insensitive" } } },
            { customer: { lastName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        order: { select: { id: true, orderCode: true, totalValue: true, expectedCompletionDate: true } },
        customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true } },
        versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { total: true, versionNumber: true } },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quotations</h1>
        <p className="text-sm text-muted-foreground">Create, send, and track customer quotations through to acceptance.</p>
      </div>

      <QuotationDashboardStats businessId={businessId} />

      <QuotationsPageClient
        quotations={JSON.parse(JSON.stringify(quotations))}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }}
        currency={business.currency}
      />
    </div>
  );
}
