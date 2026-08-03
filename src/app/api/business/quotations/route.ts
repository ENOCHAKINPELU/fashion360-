import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { financialLineItemSchema } from "@/lib/validations/quotation";
import { createQuotationFromDesignProject } from "@/lib/quotation-project";

const createSchema = z.object({
  designPreviewId: z.string().min(1),
  items: z.array(financialLineItemSchema).min(1, "Add at least one line item"),
  discount: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  deliveryFee: z.coerce.number().min(0).optional(),
  additionalCharges: z.coerce.number().min(0).optional(),
  depositPercentage: z.coerce.number().min(0).max(100).optional(),
  productionDays: z.coerce.number().int().min(0).optional(),
  estimatedDeliveryDate: z.coerce.date().optional(),
  productionDeadline: z.coerce.date().optional(),
  includedRevisions: z.coerce.number().int().min(0).optional(),
  additionalRevisionCost: z.coerce.number().min(0).optional(),
  paymentTerms: z.string().optional(),
  lateChangePolicy: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  alterationPolicy: z.string().optional(),
  deliveryPolicy: z.string().optional(),
  customTerms: z.string().optional(),
});

// Part 1: the designer's "Create Quote" action against an approved, locked
// Design Project — the pre-order counterpart of the legacy POST /quotations
// (which requires an existing Order). Everything after creation (send,
// revise, discuss, decide, convert-to-invoice) reuses the existing generic
// /api/quotations/[id]/* staff routes unchanged, since none of them assume
// an Order is present.
export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = createSchema.parse(await req.json());

    const preview = await prisma.designPreview.findUnique({ where: { id: data.designPreviewId } });
    if (!preview || preview.businessId !== businessId) throw new ApiError(404, "Design project not found");

    const quotation = await prisma.$transaction((tx) =>
      createQuotationFromDesignProject(tx, {
        businessId,
        designPreviewId: data.designPreviewId,
        items: data.items,
        discount: data.discount,
        tax: data.tax,
        deliveryFee: data.deliveryFee,
        additionalCharges: data.additionalCharges,
        depositPercentage: data.depositPercentage,
        productionDays: data.productionDays,
        estimatedDeliveryDate: data.estimatedDeliveryDate,
        productionDeadline: data.productionDeadline,
        paymentTerms: data.paymentTerms,
        includedRevisions: data.includedRevisions,
        additionalRevisionCost: data.additionalRevisionCost,
        lateChangePolicy: data.lateChangePolicy,
        cancellationPolicy: data.cancellationPolicy,
        refundPolicy: data.refundPolicy,
        alterationPolicy: data.alterationPolicy,
        deliveryPolicy: data.deliveryPolicy,
        customTerms: data.customTerms,
        createdById: session.user.id,
      })
    );

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
