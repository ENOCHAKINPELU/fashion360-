import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVOICE_DETAIL_INCLUDE } from "@/app/api/invoices/[id]/route";
import { InvoiceDetailClient } from "@/features/invoices/components/invoice-detail-client";
import type { InvoiceDetailData } from "@/features/invoices/types";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const invoice = await prisma.invoice.findFirst({ where: { id, businessId }, include: INVOICE_DETAIL_INCLUDE });
  if (!invoice) notFound();

  const serialized = JSON.parse(JSON.stringify(invoice)) as InvoiceDetailData;

  return <InvoiceDetailClient invoice={serialized} />;
}
