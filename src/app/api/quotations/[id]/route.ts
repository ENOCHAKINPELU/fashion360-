import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.quotation.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Quotation not found");

    const { status } = patchSchema.parse(await req.json());

    const quotation = await prisma.$transaction(async (tx) => {
      const updated = await tx.quotation.update({ where: { id }, data: { status } });

      if (status === "ACCEPTED") {
        const alreadyInvoiced = await tx.invoice.findUnique({ where: { quotationId: id } });
        if (!alreadyInvoiced) {
          await tx.invoice.create({
            data: {
              businessId,
              customerId: updated.customerId,
              orderId: updated.orderId,
              quotationId: id,
              invoiceNumber: `INV-${updated.quoteNumber.replace("QUO-", "")}`,
              status: "SENT",
              amount: updated.price,
              dueDate: updated.dueDate,
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ quotation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
