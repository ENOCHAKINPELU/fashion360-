import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, CustomerStatus, Gender } from "@prisma/client";
import { CustomerStats } from "@/features/customers/components/customer-stats";
import { CustomersPageClient } from "@/features/customers/components/customers-page-client";

const PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  const search = params.search?.trim();
  const status = params.status as CustomerStatus | undefined;
  const gender = params.gender as Gender | undefined;
  const vip = params.vip;
  const archived = params.archived === "true";
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;
  const sort = params.sort ?? "createdAt:desc";
  const page = Math.max(1, Number(params.page ?? 1));

  const where: Prisma.CustomerWhereInput = {
    businessId,
    isArchived: archived,
    ...(status ? { status } : {}),
    ...(gender ? { gender } : {}),
    ...(vip === "true" ? { isVip: true } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { customerCode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];
  const orderBy: Prisma.CustomerOrderByWithRelationInput =
    sortField === "name" ? { firstName: sortDir } : { [sortField]: sortDir };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { tags: true },
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">Every customer relationship, in one place.</p>
      </div>

      <CustomerStats businessId={businessId} />

      <CustomersPageClient
        customers={JSON.parse(JSON.stringify(customers))}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }}
      />
    </div>
  );
}
