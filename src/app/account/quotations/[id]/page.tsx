import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { CustomerQuotationClient } from "@/features/quotations/components/customer/customer-quotation-client";

export default async function CustomerQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireCustomerContext();

  const quotation = await prisma.quotation.findUnique({ where: { id }, select: { id: true, customerProfileId: true } });
  if (!quotation || quotation.customerProfileId !== profile.id) notFound();

  return <CustomerQuotationClient quotationId={id} />;
}
