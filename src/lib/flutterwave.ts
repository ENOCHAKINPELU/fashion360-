import { createHmac, timingSafeEqual } from "crypto";

// Platform-level Flutterwave v4 client — the ONE Flutterwave account
// Fashion360 itself holds (see FLUTTERWAVE_CLIENT_ID/SECRET/ENCRYPTION_KEY
// and FLUTTERWAVE_SENDER_ID env vars). This is deliberately separate from
// src/lib/payment-providers/flutterwave-provider.ts, which is the OLD v3,
// per-business, static-secret-key integration for a business that connects
// its own gateway — that flow still exists in the schema but businesses are
// no longer asked to use it; this file is the new one, where a business
// only ever provides a bank account (see lib/payout-recipients.ts), never
// an API key.
//
// v4 uses OAuth2 client-credentials, not a static secret key — every call
// fetches a fresh 10-minute token rather than trying to cache one across
// serverless invocations, which would be more fragile than the extra round
// trip is expensive.
//
// The API host below was confirmed empirically against a real sandbox
// account — Flutterwave's own docs give inconsistent examples (some show
// api.flutterwave.com, which 404s for these endpoints). The live/production
// host is NOT yet confirmed the same way — do not flip FLUTTERWAVE_ENV to
// "live" without verifying it against a real live account first.
const IDP_TOKEN_URL = "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";
const API_BASE =
  process.env.FLUTTERWAVE_ENV === "live" ? "https://api.flutterwave.com" : "https://developersandbox-api.flutterwave.com";

export function isFlutterwaveConfigured(): boolean {
  return Boolean(process.env.FLUTTERWAVE_CLIENT_ID && process.env.FLUTTERWAVE_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.FLUTTERWAVE_CLIENT_ID;
  const clientSecret = process.env.FLUTTERWAVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Flutterwave is not configured (missing FLUTTERWAVE_CLIENT_ID/FLUTTERWAVE_CLIENT_SECRET)");

  const res = await fetch(IDP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? "Could not authenticate with Flutterwave");
  return json.access_token as string;
}

function extractErrorMessage(json: Record<string, unknown>): string {
  const error = json.error as { message?: string; validation_errors?: { field_name: string; message: string }[] } | undefined;
  if (error?.validation_errors?.length) {
    return error.validation_errors.map((v) => `${v.field_name}: ${v.message}`).join("; ");
  }
  return error?.message ?? (json.message as string) ?? "Flutterwave request failed";
}

async function flutterwaveFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok || json.status === "failed") throw new Error(extractErrorMessage(json));
  return json;
}

export interface FlutterwaveBank {
  name: string;
  code: string;
  country: string;
}

export async function listBanks(country = "NG"): Promise<FlutterwaveBank[]> {
  const json = await flutterwaveFetch(`/banks?country=${encodeURIComponent(country)}`);
  return (json.data ?? []) as FlutterwaveBank[];
}

export interface CreateRecipientResult {
  id: string;
  accountName: string | null;
}

// NGN-only for now (type: "bank_ngn") — matches this app's currency
// defaults everywhere else. Flutterwave's other recipient types (bank_usd,
// mobile money, etc.) need materially more fields (name, address, phone) —
// out of scope until a business actually needs a non-NGN payout.
export async function createTransferRecipient(params: { accountNumber: string; bankCode: string }): Promise<CreateRecipientResult> {
  const json = await flutterwaveFetch("/transfers/recipients", {
    method: "POST",
    body: JSON.stringify({ type: "bank_ngn", bank: { account_number: params.accountNumber, code: params.bankCode } }),
  });
  const name = json.data?.name as { first?: string; last?: string } | undefined;
  const accountName = name ? [name.first, name.last].filter(Boolean).join(" ") || null : null;
  return { id: json.data.id as string, accountName };
}

export interface CreateTransferResult {
  id: string;
  status: string;
}

// Every transfer needs both a recipient (the business's bank account,
// created once and reused — see payout-recipients.ts) and the platform
// sender (created once, ever, via scripts/setup-flutterwave-sender.mjs).
export async function createTransfer(params: {
  recipientId: string;
  amount: number;
  reference: string;
  narration: string;
}): Promise<CreateTransferResult> {
  const senderId = process.env.FLUTTERWAVE_SENDER_ID;
  if (!senderId) throw new Error("Flutterwave sender is not configured (missing FLUTTERWAVE_SENDER_ID)");

  const json = await flutterwaveFetch("/transfers", {
    method: "POST",
    body: JSON.stringify({
      action: "instant",
      reference: params.reference,
      narration: params.narration,
      payment_instruction: {
        recipient_id: params.recipientId,
        sender_id: senderId,
        source_currency: "NGN",
        amount: { value: params.amount, applies_to: "destination_currency" },
      },
    }),
  });
  return { id: json.data.id as string, status: json.data.status as string };
}

export async function getTransferStatus(transferId: string): Promise<{ status: string }> {
  const json = await flutterwaveFetch(`/transfers/${encodeURIComponent(transferId)}`);
  return { status: json.data.status as string };
}

// ---------------------------------------------------------------------------
// Charges — the customer "pay in" side. Collected into Fashion360's own
// platform Flutterwave balance (not a business's), then later moved out via
// createTransfer above once an order is payout-eligible. See
// src/lib/payment-providers/platform-flutterwave-provider.ts, the only
// caller of these three functions.
//
// payment_method.type "bank_account" is the only charge type wired up.
// v4's own hosted "Standard" checkout (the direct successor to v3's
// /v3/payments, which returns one link covering every payment method) is
// still unreleased as of this writing — Flutterwave's own engineers
// describe it as "coming soon" in their v4 migration write-ups. Every other
// v4 payment_method type needs something Fashion360 doesn't have: "card"
// needs raw card fields AES-encrypted client-side (a PCI-scope widget that
// doesn't exist yet for v4), "mobile_money"/"ussd" need a bank/network code
// picked up front. "bank_account" was confirmed empirically (against the
// real sandbox account) to need no extra fields and to return a genuine
// Flutterwave-hosted redirect page — the same "customer clicks a link, pays,
// comes back" shape as v3 Standard, just narrower in which methods it
// offers on that page. Swap this for "card" or a true multi-method hosted
// checkout the moment v4 Standard ships or a client-side card widget is
// built — nothing above this function needs to change, PaymentProvider
// callers only ever see an authorizationUrl.
const CHARGES_PATH = "/orchestration/direct-charges";

export interface CreateChargeResult {
  id: string;
  status: string;
  redirectUrl: string | null;
}

export async function createCharge(params: {
  amount: number;
  currency: string;
  reference: string;
  redirectUrl: string;
  customerEmail: string;
}): Promise<CreateChargeResult> {
  const json = await flutterwaveFetch(CHARGES_PATH, {
    method: "POST",
    headers: { "X-Trace-Id": params.reference, "X-Idempotency-Key": params.reference },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      redirect_url: params.redirectUrl,
      payment_method: { type: "bank_account" },
      customer: { email: params.customerEmail },
    }),
  });
  const redirectUrl = (json.data?.next_action?.redirect_url?.url as string | undefined) ?? null;
  return { id: json.data.id as string, status: json.data.status as string, redirectUrl };
}

export interface ChargeStatus {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reference: string;
}

export async function getCharge(chargeId: string): Promise<ChargeStatus> {
  const json = await flutterwaveFetch(`/charges/${encodeURIComponent(chargeId)}`);
  return {
    id: json.data.id as string,
    status: json.data.status as string,
    amount: json.data.amount as number,
    currency: json.data.currency as string,
    reference: json.data.reference as string,
  };
}

export async function refundCharge(params: { chargeId: string; amount: number; reason?: string }): Promise<{ id: string; status: string }> {
  const traceId = `refund${params.chargeId}`.slice(0, 60);
  const json = await flutterwaveFetch("/refunds", {
    method: "POST",
    headers: { "X-Trace-Id": traceId, "X-Idempotency-Key": `${traceId}${Date.now()}` },
    body: JSON.stringify({ charge_id: params.chargeId, amount: params.amount, reason: params.reason ?? "requested_by_customer" }),
  });
  return { id: json.data.id as string, status: json.data.status as string };
}

// v4 webhooks are signed with HMAC-SHA256 over the raw request body, using a
// secret hash chosen by us and pasted into the Flutterwave dashboard
// (Settings -> Webhooks) — there's no API to register it, only the
// dashboard. See FLUTTERWAVE_WEBHOOK_SECRET and the platform webhook route.
export function verifyChargeWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
