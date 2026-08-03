import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QUOTATION_DETAIL_INCLUDE } from "@/app/api/quotations/[id]/route";
import { QuotationWorkspaceClient } from "@/features/quotations/components/quotation-workspace-client";
import type { QuotationDetailData } from "@/features/quotations/types";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [quotation, business] = await Promise.all([
    prisma.quotation.findFirst({ where: { id, businessId }, include: QUOTATION_DETAIL_INCLUDE }),
    prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { currency: true } }),
  ]);

  if (!quotation) notFound();

  const serialized = JSON.parse(JSON.stringify(quotation)) as QuotationDetailData;

  return <QuotationWorkspaceClient quotation={serialized} currency={business.currency} />;
}
