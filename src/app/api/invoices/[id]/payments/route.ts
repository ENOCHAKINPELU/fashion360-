import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { offlinePaymentSchema } from "@/lib/validations/invoice";
import { recordPayment } from "@/lib/payment-recording";
import { getScopedInvoice } from "@/app/api/invoices/[id]/route";

// Staff-recorded offline payment (bank transfer, cash, POS, card, other) —
// section 17 of the Phase 8 spec. Every offline payment gets its own
// generated idempotency key since there's no provider event to dedupe on.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const invoice = await getScopedInvoice(businessId, id);

    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      throw new ApiError(400, "Cannot record a payment on a void or cancelled invoice");
    }

    const data = offlinePaymentSchema.parse(await req.json());
    if (data.amount > invoice.balanceDue + 0.01) {
      throw new ApiError(400, "Payment amount cannot exceed the outstanding balance");
    }

    const { payment } = await prisma.$transaction((tx) =>
      recordPayment(tx, {
        businessId,
        invoiceId: id,
        amount: data.amount,
        currency: invoice.currency,
        method: data.method,
        provider: "MANUAL",
        providerReference: data.reference || null,
        idempotencyKey: `manual_${randomUUID()}`,
        status: "SUCCESSFUL",
        milestoneId: data.milestoneId || null,
        recordedById: session.user.id,
        notes: data.notes || null,
        actorType: "STAFF",
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
