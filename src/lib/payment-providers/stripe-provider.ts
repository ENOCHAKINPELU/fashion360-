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

const BASE_URL = "https://api.stripe.com/v1";

// Reference implementation against Stripe's Checkout Sessions API. Stripe's
// classic REST endpoints take form-encoded bodies (not JSON), and its
// providerReference is the Checkout Session id (not our own merchant
// reference) — refunds go through the session's underlying payment_intent.
export class StripeProvider implements PaymentProvider {
  constructor(private credentials: PaymentProviderCredentials) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.credentials.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", `${params.callbackUrl}${params.callbackUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`);
    body.set("cancel_url", params.callbackUrl);
    body.set("customer_email", params.email);
    body.set("client_reference_id", params.reference);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", params.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(Math.round(params.amount * 100)));
    body.set("line_items[0][price_data][product_data][name]", `Invoice ${params.reference}`);
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        body.set(`metadata[${key}]`, String(value));
      }
    }

    const res = await fetch(`${BASE_URL}/checkout/sessions`, { method: "POST", headers: this.headers(), body });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Failed to initialize Stripe checkout session");
    return { authorizationUrl: json.url, providerReference: json.id };
  }

  async verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${BASE_URL}/checkout/sessions/${providerReference}`, { headers: this.headers() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Failed to verify Stripe checkout session");
    return {
      status: json.payment_status === "paid" ? "SUCCESSFUL" : json.status === "expired" ? "FAILED" : "PENDING",
      amount: (json.amount_total ?? 0) / 100,
      currency: String(json.currency ?? "").toUpperCase(),
      providerReference: json.id,
      paidAt: json.payment_status === "paid" ? new Date() : null,
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader || !this.credentials.webhookSecret) return false;
    const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=") as [string, string]));
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;
    const expected = createHmac("sha256", this.credentials.webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
    const body = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data: { object: { id: string; client_reference_id?: string; amount_total?: number; currency?: string; payment_status?: string } };
    };
    const obj = body.data.object;
    const type: ParsedWebhookEvent["type"] =
      body.type === "checkout.session.completed"
        ? "PAYMENT_SUCCESSFUL"
        : body.type === "checkout.session.expired"
          ? "PAYMENT_FAILED"
          : body.type === "charge.refunded"
            ? "REFUND_SUCCESSFUL"
            : null;
    return {
      type,
      reference: obj.client_reference_id ?? obj.id,
      providerEventId: body.id,
      amount: obj.amount_total != null ? obj.amount_total / 100 : null,
      currency: obj.currency ? obj.currency.toUpperCase() : null,
      status: type === "PAYMENT_SUCCESSFUL" ? "SUCCESSFUL" : type === "PAYMENT_FAILED" ? "FAILED" : null,
    };
  }

  async initiateRefund(params: InitiateRefundParams): Promise<InitiateRefundResult> {
    const sessionRes = await fetch(`${BASE_URL}/checkout/sessions/${params.providerReference}`, { headers: this.headers() });
    const session = await sessionRes.json();
    if (!sessionRes.ok || !session.payment_intent) return { status: "FAILED", providerRefundReference: null };

    const body = new URLSearchParams();
    body.set("payment_intent", session.payment_intent);
    body.set("amount", String(Math.round(params.amount * 100)));

    const res = await fetch(`${BASE_URL}/refunds`, { method: "POST", headers: this.headers(), body });
    const json = await res.json();
    if (!res.ok) return { status: "FAILED", providerRefundReference: null };
    return { status: json.status === "succeeded" ? "SUCCESSFUL" : "PENDING", providerRefundReference: json.id };
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const res = await fetch(`${BASE_URL}/balance`, { headers: this.headers() });
      const json = await res.json();
      if (!res.ok) return { success: false, message: json.error?.message ?? "Connection failed" };
      return { success: true, message: "Connected to Stripe successfully." };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Connection failed" };
    }
  }
}
