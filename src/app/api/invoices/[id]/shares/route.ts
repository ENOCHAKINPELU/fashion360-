import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { financialShareCreateSchema } from "@/lib/validations/quotation";
import { generateShareToken } from "@/lib/invoice-share";
import { getScopedInvoice } from "@/app/api/invoices/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedInvoice(businessId, id);

    const shares = await prisma.invoiceShare.findMany({ where: { invoiceId: id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ shares });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedInvoice(businessId, id);

    const data = financialShareCreateSchema.parse(await req.json());
    const expiresAt = new Date(Date.now() + (data.expiresInDays ?? 30) * 24 * 60 * 60 * 1000);

    const share = await prisma.invoiceShare.create({
      data: {
        invoiceId: id,
        businessId,
        token: generateShareToken(),
        channel: data.channel,
        expiresAt,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
