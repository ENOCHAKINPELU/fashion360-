import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerOrder } from "@/lib/order-access";
import { createInvoicePaymentLink } from "@/lib/payment-link";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Part 8/9: "Customer Pays 100%" — reuses the exact same provider-agnostic
// payment-link + webhook + ledger pipeline the legacy invoice-pay flow
// already uses; the customer never has to know an Invoice exists under the
// hood. milestoneId is intentionally not exposed here — every order created
// through this flow is a single full-balance payment.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();

    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`pay-init:${ip}:${profile.id}`, 15, 15 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many payment attempts. Please try again shortly.");

    const order = await loadCustomerOrder(id, profile.id);

    const invoice = await prisma.invoice.findFirst({ where: { orderId: id } });
    if (!invoice) throw new ApiError(400, "This order isn't ready for payment yet");

    const callbackUrl = new URL(`/account/orders/${id}`, req.nextUrl.origin).toString();
    const link = await createInvoicePaymentLink(prisma, { businessId: order.businessId, invoiceId: invoice.id, callbackUrl });

    return NextResponse.json(link);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
