import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { createTransferRecipient, isFlutterwaveConfigured } from "@/lib/flutterwave";

type Db = typeof prisma | Prisma.TransactionClient;

// Real account-name verification via the PLATFORM's own Flutterwave
// account (not a business's — businesses never provide a gateway key,
// only a bank account). Registering a Transfer Recipient is itself the
// verification: Flutterwave resolves and returns the real account holder's
// name, which is what makes a wrong account number visible before anyone
// relies on it. Falls back to "can't verify automatically" only if the
// platform's own Flutterwave credentials aren't configured at all.
async function resolveAndRegisterRecipient(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<{ supported: true; recipientId: string; accountName: string | null } | { supported: false; message: string }> {
  if (!isFlutterwaveConfigured()) {
    return {
      supported: false,
      message: "Automatic account name verification isn't available right now. The account name must be entered and confirmed manually.",
    };
  }

  try {
    const { id, accountName } = await createTransferRecipient({ accountNumber: params.accountNumber, bankCode: params.bankCode });
    return { supported: true, recipientId: id, accountName };
  } catch (error) {
    return { supported: false, message: error instanceof Error ? error.message : "Could not verify this account number with Flutterwave." };
  }
}

// Creates/updates the business's single payout destination. Deliberately
// collects only what's needed to move money to a bank account — no card
// data, no provider API credentials (Part 12). Every save registers a real
// Flutterwave Transfer Recipient (recipients are create-only, not
// updatable, so changing bank details always registers a fresh one) —
// providerRecipientCode is what processPayout (lib/payout.ts) later uses
// to actually move money.
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
  const resolution = await resolveAndRegisterRecipient({ accountNumber: params.accountNumber, bankCode: params.bankCode });
  const accountName = resolution.supported ? resolution.accountName : null;
  const recipientId = resolution.supported ? resolution.recipientId : null;

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
      provider: recipientId ? "FLUTTERWAVE" : null,
      providerRecipientCode: recipientId,
      kycStatus: accountName ? "PENDING" : "NOT_SUBMITTED",
    },
    update: {
      legalName: params.legalName,
      businessName: params.businessName ?? null,
      bankName: params.bankName,
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
      accountName,
      provider: recipientId ? "FLUTTERWAVE" : null,
      providerRecipientCode: recipientId,
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

// Staff-driven manual verification — Flutterwave resolving the account name
// proves the account is real, but an admin still confirms it belongs to
// the right business before payouts start flowing to it (same "human
// checks before real money moves" pattern the rest of this system uses).
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
