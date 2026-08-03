import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { decryptSecret } from "@/lib/encryption";
import { logAuditEvent } from "@/lib/audit-log";

type Db = typeof prisma | Prisma.TransactionClient;

// Bank account name resolution, so a typo'd account number is caught before
// anyone relies on it — real, per Paystack's own "Resolve Account Number"
// endpoint (GET /bank/resolve). Only Paystack exposes this in the three
// providers this codebase integrates: Flutterwave's account-resolution
// endpoint has a different shape and Stripe doesn't support NG bank account
// resolution at all, so this deliberately reports "unsupported" rather than
// faking a result for those providers or for a business with no connected
// gateway — see lib/payment-architecture.ts for the same honesty pattern
// applied elsewhere.
export async function resolveBankAccount(
  businessId: string,
  params: { accountNumber: string; bankCode: string }
): Promise<{ supported: true; accountName: string } | { supported: false; message: string }> {
  const connection = await prisma.paymentGatewayConnection.findFirst({
    where: { businessId, isActive: true },
  });

  if (!connection || connection.provider !== "PAYSTACK" || !connection.secretKeyEncrypted) {
    return {
      supported: false,
      message: "Automatic account name verification isn't available for this business's connected provider. The account name must be entered and confirmed manually.",
    };
  }

  const secretKey = decryptSecret(connection.secretKeyEncrypted);
  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(params.accountNumber)}&bank_code=${encodeURIComponent(params.bankCode)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  const json = await res.json();
  if (!res.ok || !json.status) {
    return { supported: false, message: json.message ?? "Could not verify this account number with the provider." };
  }
  return { supported: true, accountName: json.data.account_name as string };
}

// Creates/updates the business's single payout destination. Deliberately
// collects only what's needed to eventually move money to a bank account —
// no card data, no provider API credentials (implementation rule 12).
// providerRecipientCode stays null: there's no platform-level merchant
// account today to register a real Transfer Recipient against (see
// lib/payment-architecture.ts) — this record exists so that piece can be
// wired in later without a schema change.
export async function upsertPayoutRecipient(
  db: Db,
  params: {
    businessId: string;
    legalName: string;
    businessName?: string | null;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    actorId?: string | null;
  }
) {
  const resolution = await resolveBankAccount(params.businessId, {
    accountNumber: params.accountNumber,
    bankCode: params.bankCode,
  });
  const accountName = resolution.supported ? resolution.accountName : null;

  const recipient = await db.payoutRecipient.upsert({
    where: { businessId: params.businessId },
    create: {
      businessId: params.businessId,
      legalName: params.legalName,
      businessName: params.businessName ?? null,
      bankName: params.bankName,
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
      accountName,
      kycStatus: accountName ? "PENDING" : "NOT_SUBMITTED",
    },
    update: {
      legalName: params.legalName,
      businessName: params.businessName ?? null,
      bankName: params.bankName,
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
      accountName,
      kycStatus: accountName ? "PENDING" : "NOT_SUBMITTED",
      verifiedAt: null,
      verifiedNote: null,
    },
  });

  await logAuditEvent(db, {
    action: "PAYOUT_RECIPIENT_VERIFIED",
    businessId: params.businessId,
    userId: params.actorId,
    entityType: "PayoutRecipient",
    entityId: recipient.id,
    metadata: { accountNameResolved: resolution.supported, message: resolution.supported ? undefined : resolution.message },
  });

  return { recipient, accountNameResolved: resolution.supported, message: resolution.supported ? undefined : resolution.message };
}

export async function getPayoutRecipient(businessId: string) {
  return prisma.payoutRecipient.findUnique({ where: { businessId } });
}

// Staff-driven manual verification — since there's no real KYC provider
// integration in this environment, this simply records who confirmed the
// bank details are correct and lets an admin flip PENDING -> VERIFIED
// (or REJECTED) with a note, the same "honest manual record-keeping"
// pattern lib/payout.ts's processPayout already uses for offline settlement.
export async function setPayoutRecipientKycStatus(
  db: Db,
  params: { businessId: string; status: "VERIFIED" | "REJECTED"; note?: string | null; actorId?: string | null }
) {
  const existing = await db.payoutRecipient.findUnique({ where: { businessId: params.businessId } });
  if (!existing) throw new ApiError(404, "No payout account on file for this business");

  const updated = await db.payoutRecipient.update({
    where: { businessId: params.businessId },
    data: { kycStatus: params.status, verifiedAt: new Date(), verifiedNote: params.note ?? null },
  });

  await logAuditEvent(db, {
    action: "PAYOUT_RECIPIENT_VERIFIED",
    businessId: params.businessId,
    userId: params.actorId,
    entityType: "PayoutRecipient",
    entityId: updated.id,
    metadata: { status: params.status, note: params.note },
  });

  return updated;
}
