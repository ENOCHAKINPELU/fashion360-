import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessPermission, requireBusinessContext } from "@/lib/rbac";
import { refundCreateSchema } from "@/lib/validations/invoice";
import { resolvePaymentProvider } from "@/lib/payment-providers";
import { processRefund } from "@/lib/refund-processing";
import { checkRateLimit } from "@/lib/rate-limit";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const customerId = req.nextUrl.searchParams.get("customerId");

    const where = { businessId, ...(customerId ? { payment: { customerId } } : {}) };

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          payment: { include: { invoice: { select: { invoiceNumber: true } }, customer: { select: { firstName: true, lastName: true } } } },
          processedBy: { select: { name: true } },
        },
      }),
      prisma.refund.count({ where }),
    ]);

    return NextResponse.json({
      refunds,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessPermission("MANAGE_PAYMENTS");

    const { allowed } = checkRateLimit(`refund-create:${businessId}`, 30, 15 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many refund requests. Please try again shortly.");

    const data = refundCreateSchema.parse(await req.json());

    const payment = await prisma.payment.findFirst({ where: { id: data.paymentId, businessId } });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.status !== "SUCCESSFUL") throw new ApiError(400, "Only a successful payment can be refunded");

    const alreadyRefunded = await prisma.refund.aggregate({
      where: { paymentId: payment.id, status: "SUCCESSFUL" },
      _sum: { amount: true },
    });
    const refundedSoFar = alreadyRefunded._sum.amount ?? 0;
    if (data.amount > payment.amount - refundedSoFar + 0.01) {
      throw new ApiError(400, "Refund amount exceeds the amount available to refund on this payment");
    }

    let providerRefundReference: string | null = null;
    let status: "SUCCESSFUL" | "PENDING" | "FAILED" = "SUCCESSFUL";

    if (payment.provider !== "MANUAL" && payment.providerReference) {
      const connection = await prisma.paymentGatewayConnection.findUnique({
        where: { businessId_provider: { businessId, provider: payment.provider } },
      });
      if (!connection) throw new ApiError(400, "The original payment gateway is no longer connected, process this refund manually");

      const result = await resolvePaymentProvider(connection).initiateRefund({
        providerReference: payment.providerReference,
        amount: data.amount,
        currency: payment.currency,
      });
      status = result.status;
      providerRefundReference = result.providerRefundReference;
    }

    const refund = await prisma.$transaction((tx) =>
      processRefund(tx, {
        businessId,
        paymentId: payment.id,
        amount: data.amount,
        type: data.type,
        reason: data.reason,
        status,
        providerRefundReference,
        processedById: session.user.id,
        actorType: "STAFF",
      })
    );

    return NextResponse.json({ refund }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
