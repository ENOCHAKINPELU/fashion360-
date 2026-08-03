import type { Prisma, FinancialTransactionType, FinancialActorType, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Writes one row to the unified ledger/audit trail (see schema comment on
// FinancialTransaction). Every quotation/invoice/payment/refund/gateway
// mutation in this module should call this so section 27 (transaction
// history) and section 37 (audit log) are always populated together.
export async function logFinancialTransaction(
  db: Db,
  params: {
    businessId: string;
    type: FinancialTransactionType;
    description: string;
    orderId?: string | null;
    customerId?: string | null;
    quotationId?: string | null;
    invoiceId?: string | null;
    paymentId?: string | null;
    refundId?: string | null;
    amount?: number | null;
    currency?: string | null;
    method?: PaymentMethod | null;
    reference?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    actorType?: FinancialActorType;
    actorId?: string | null;
  }
) {
  await db.financialTransaction.create({
    data: {
      businessId: params.businessId,
      type: params.type,
      description: params.description,
      orderId: params.orderId ?? null,
      customerId: params.customerId ?? null,
      quotationId: params.quotationId ?? null,
      invoiceId: params.invoiceId ?? null,
      paymentId: params.paymentId ?? null,
      refundId: params.refundId ?? null,
      amount: params.amount ?? null,
      currency: params.currency ?? null,
      method: params.method ?? null,
      reference: params.reference ?? null,
      previousStatus: params.previousStatus ?? null,
      newStatus: params.newStatus ?? null,
      actorType: params.actorType ?? "STAFF",
      actorId: params.actorId ?? null,
    },
  });
}
