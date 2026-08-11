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
