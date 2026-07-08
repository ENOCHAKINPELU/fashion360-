import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const invoices = await prisma.invoice.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
  });

  return <InvoicesClient invoices={JSON.parse(JSON.stringify(invoices))} />;
}
