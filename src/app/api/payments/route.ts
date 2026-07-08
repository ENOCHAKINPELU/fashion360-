import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { getPaymentProvider } from "@/lib/providers/payment";
import { generateNumber } from "@/lib/utils";
import { z } from "zod";

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  type: z.enum(["DEPOSIT", "BALANCE", "FULL", "REFUND"]),
  amount: z.coerce.number().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const customerId = req.nextUrl.searchParams.get("customerId");

    const payments = await prisma.payment.findMany({
      where: { businessId, ...(customerId ? { customerId } : {}) },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = paymentSchema.parse(await req.json());

    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, businessId },
    });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    const provider = getPaymentProvider();
    const charge = await provider.charge({
      amount: data.amount,
      currency: "NGN",
      reference: generateNumber("PAY"),
    });

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          businessId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          type: data.type,
          status: charge.status,
          amount: data.amount,
          provider: provider.name,
          providerRef: charge.providerRef,
          paidAt: charge.status === "PAID" ? new Date() : null,
        },
      });

      if (charge.status === "PAID") {
        const newAmountPaid = Number(invoice.amountPaid) + data.amount;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newAmountPaid,
            status: newAmountPaid >= Number(invoice.amount) ? "PAID" : "SENT",
          },
        });
      }

      return payment;
    });

    return NextResponse.json({ payment: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
