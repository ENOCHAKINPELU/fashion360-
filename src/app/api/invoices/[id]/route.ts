import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { invoiceUpdateSchema } from "@/lib/validations/invoice";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { syncOrderFinancials } from "@/lib/order-financial-sync";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const INVOICE_DETAIL_INCLUDE = {
  order: { select: { id: true, orderCode: true, totalValue: true, expectedCompletionDate: true, measurementProfileId: true } },
  customer: {
    select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
  },
  quotation: { select: { id: true, quotationNumber: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  paymentSchedule: { include: { milestones: { orderBy: { sortOrder: "asc" as const } } } },
  payments: {
    orderBy: { createdAt: "desc" as const },
    include: { recordedBy: { select: { name: true } }, receipt: true, refunds: true },
  },
  shares: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.InvoiceInclude;

export async function getScopedInvoice(businessId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id, businessId } });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  return invoice;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({ where: { id, businessId }, include: INVOICE_DETAIL_INCLUDE });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    return NextResponse.json({ invoice });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.union([invoiceUpdateSchema, z.object({ action: z.enum(["void", "cancel", "archive"]) })]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const invoice = await getScopedInvoice(businessId, id);

    const body = patchSchema.parse(await req.json());

    if ("action" in body) {
      if (invoice.amountPaid > 0 && body.action !== "archive") {
        throw new ApiError(400, "An invoice with recorded payments cannot be voided or cancelled, issue a refund instead");
      }
      const status = body.action === "void" ? "VOID" : body.action === "cancel" ? "CANCELLED" : "ARCHIVED";
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.invoice.update({ where: { id }, data: { status }, include: INVOICE_DETAIL_INCLUDE });
        await logFinancialTransaction(tx, {
          businessId,
          type: body.action === "void" ? "INVOICE_VOIDED" : "INVOICE_ARCHIVED",
          description: `Invoice ${invoice.invoiceNumber} ${body.action}d`,
          orderId: invoice.orderId,
          customerId: invoice.customerId,
          invoiceId: id,
          previousStatus: invoice.status,
          newStatus: status,
          actorType: "STAFF",
          actorId: session.user.id,
        });
        if (body.action !== "archive") {
          await syncOrderFinancials(tx, { orderId: invoice.orderId, businessId, actorId: session.user.id });
        }
        return result;
      });
      return NextResponse.json({ invoice: updated });
    }

    if (invoice.status !== "DRAFT") throw new ApiError(400, "Only a draft invoice can be edited, void it and create a new one instead");

    const data = body;
    let updateData: Prisma.InvoiceUpdateInput = {
      dueDate: data.dueDate,
      paymentInstructions: data.paymentInstructions,
      paymentTerms: data.paymentTerms,
      cancellationPolicy: data.cancellationPolicy,
      refundPolicy: data.refundPolicy,
      alterationPolicy: data.alterationPolicy,
      deliveryPolicy: data.deliveryPolicy,
      customTerms: data.customTerms,
    };

    if (data.items) {
      const items = data.items.map((item, index) => ({
        businessId,
        type: item.type,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        subtotal: item.quantity * item.unitPrice - item.discount + item.tax,
        sortOrder: index,
      }));
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const discount = data.discount ?? invoice.discount;
      const tax = data.tax ?? invoice.tax;
      const deliveryFee = data.deliveryFee ?? invoice.deliveryFee;
      const additionalCharges = data.additionalCharges ?? invoice.additionalCharges;
      const total = subtotal - discount + tax + deliveryFee + additionalCharges;

      updateData = {
        ...updateData,
        subtotal,
        discount,
        tax,
        deliveryFee,
        additionalCharges,
        total,
        balanceDue: total,
        items: { deleteMany: {}, create: items },
      };
    }

    const updated = await prisma.invoice.update({ where: { id }, data: updateData, include: INVOICE_DETAIL_INCLUDE });
    return NextResponse.json({ invoice: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
