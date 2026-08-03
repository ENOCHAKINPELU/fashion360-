import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaymentProvider,
  PaymentProviderCredentials,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
  ParsedWebhookEvent,
  InitiateRefundParams,
  InitiateRefundResult,
  TestConnectionResult,
} from "@/lib/payment-providers/types";

const BASE_URL = "https://api.paystack.co";

const EVENT_MAP: Record<string, ParsedWebhookEvent["type"]> = {
  "charge.success": "PAYMENT_SUCCESSFUL",
  "charge.failed": "PAYMENT_FAILED",
  "transfer.reversed": "PAYMENT_REVERSED",
  "refund.processed": "REFUND_SUCCESSFUL",
  "refund.failed": "REFUND_FAILED",
};

const STATUS_MAP: Record<string, VerifyPaymentResult["status"]> = {
  success: "SUCCESSFUL",
  failed: "FAILED",
  abandoned: "FAILED",
};

// Reference implementation of the provider abstraction against Paystack's
// REST API (amounts are in kobo — the smallest currency unit — so every
// amount is multiplied/divided by 100 at the boundary).
export class PaystackProvider implements PaymentProvider {
  constructor(private credentials: PaymentProviderCredentials) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.credentials.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const res = await fetch(`${BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100),
        currency: params.currency,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.status) throw new Error(json.message ?? "Failed to initialize Paystack transaction");
    return { authorizationUrl: json.data.authorization_url, providerReference: json.data.reference };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: this.headers(),
    });
    const json = await res.json();
    if (!res.ok || !json.status) throw new Error(json.message ?? "Failed to verify Paystack transaction");
    return {
      status: STATUS_MAP[json.data.status as string] ?? "PENDING",
      amount: json.data.amount / 100,
      currency: json.data.currency,
      providerReference: json.data.reference,
      paidAt: json.data.paid_at ? new Date(json.data.paid_at) : null,
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader || !this.credentials.secretKey) return false;
    const expected = createHmac("sha512", this.credentials.secretKey).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
    const body = JSON.parse(rawBody) as {
      event: string;
      data: { id: number; reference: string; amount: number; currency: string; status: string };
    };
    return {
      type: EVENT_MAP[body.event] ?? null,
      reference: body.data?.reference ?? null,
      providerEventId: String(body.data?.id ?? `${body.event}:${body.data?.reference}`),
      amount: body.data?.amount != null ? body.data.amount / 100 : null,
      currency: body.data?.currency ?? null,
      status: STATUS_MAP[body.data?.status] ?? (body.event === "charge.failed" ? "FAILED" : null),
    };
  }

  async initiateRefund(params: InitiateRefundParams): Promise<InitiateRefundResult> {
    const res = await fetch(`${BASE_URL}/refund`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ transaction: params.providerReference, amount: Math.round(params.amount * 100) }),
    });
    const json = await res.json();
    if (!res.ok || !json.status) return { status: "FAILED", providerRefundReference: null };
    return {
      status: json.data.status === "processed" ? "SUCCESSFUL" : "PENDING",
      providerRefundReference: String(json.data.id ?? ""),
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const res = await fetch(`${BASE_URL}/transaction?perPage=1`, { headers: this.headers() });
      const json = await res.json();
      if (!res.ok || !json.status) return { success: false, message: json.message ?? "Connection failed" };
      return { success: true, message: "Connected to Paystack successfully." };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Connection failed" };
    }
  }
}
