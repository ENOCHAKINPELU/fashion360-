import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, InvoiceStatus } from "@prisma/client";
import { InvoiceDashboardStats } from "@/features/invoices/components/invoice-dashboard-stats";
import { InvoicesPageClient } from "@/features/invoices/components/invoices-page-client";

const PAGE_SIZE = 20;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  const search = params.search?.trim();
  const status = params.status as InvoiceStatus | undefined;
  const orderId = params.orderId;
  const customerId = params.customerId;
  const page = Math.max(1, Number(params.page ?? 1));

  const where: Prisma.InvoiceWhereInput = {
    businessId,
    ...(status ? { status } : {}),
    ...(orderId ? { orderId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" } },
            { order: { orderCode: { contains: search, mode: "insensitive" } } },
            { customer: { firstName: { contains: search, mode: "insensitive" } } },
            { customer: { lastName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        order: { select: { id: true, orderCode: true, totalValue: true, expectedCompletionDate: true } },
        customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">Generate invoices, track payments, and stay on top of outstanding balances.</p>
      </div>

      <InvoiceDashboardStats businessId={businessId} />

      <InvoicesPageClient
        invoices={JSON.parse(JSON.stringify(invoices))}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }}
      />
    </div>
  );
}
