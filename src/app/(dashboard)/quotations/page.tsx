import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuotationsClient } from "./quotations-client";

export default async function QuotationsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [quotations, customers] = await Promise.all([
    prisma.quotation.findMany({
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

  return <QuotationsClient quotations={JSON.parse(JSON.stringify(quotations))} customers={customers} />;
}
