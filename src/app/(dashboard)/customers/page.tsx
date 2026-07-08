import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string }>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const { q, new: isNew } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: {
      businessId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true, measurements: true } } },
  });

  return <CustomersClient customers={customers} initialQuery={q || ""} autoOpen={isNew === "1"} />;
}
