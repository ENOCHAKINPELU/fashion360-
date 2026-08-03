import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerQuotation } from "@/lib/quotation-project";
import { notifyFinancialEvent } from "@/lib/financial-notifications";

const commentSchema = z.object({ body: z.string().trim().min(1), versionId: z.string().optional() });

// Part 6: "Quotation Discussion" — negotiation before accepting (e.g. "can
// you reduce the delivery fee?"), not live chat. Every message belongs to
// this one quotation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const quotation = await loadCustomerQuotation(id, profile.id);
    const data = commentSchema.parse(await req.json());

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.quotationComment.create({
        data: {
          quotationId: id,
          businessId: quotation.businessId,
          versionId: data.versionId || null,
          authorType: "CUSTOMER",
          customerProfileId: profile.id,
          body: data.body,
        },
      });

      const preview = quotation.designPreviewId ? await tx.designPreview.findUnique({ where: { id: quotation.designPreviewId } }) : null;
      await notifyFinancialEvent(tx, {
        businessId: quotation.businessId,
        orderId: quotation.orderId,
        assignedDesignerId: preview?.assignedDesignerId,
        title: "New message on quotation",
        body: `${quotation.quotationNumber}: "${data.body.slice(0, 100)}"`,
      });

      return created;
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
