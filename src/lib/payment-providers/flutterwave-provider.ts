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

const BASE_URL = "https://api.flutterwave.com/v3";

const STATUS_MAP: Record<string, VerifyPaymentResult["status"]> = {
  successful: "SUCCESSFUL",
  success: "SUCCESSFUL",
  failed: "FAILED",
};

// Reference implementation against Flutterwave's v3 REST API. Flutterwave
// verifies webhooks by a static shared secret hash header rather than an
// HMAC signature, and refunds require its internal numeric transaction id
// (not the merchant tx_ref we generate) — resolved via verify_by_reference.
export class FlutterwaveProvider implements PaymentProvider {
  constructor(private credentials: PaymentProviderCredentials) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.credentials.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amount,
        currency: params.currency,
        redirect_url: params.callbackUrl,
        customer: { email: params.email },
        meta: params.metadata,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== "success") throw new Error(json.message ?? "Failed to initialize Flutterwave payment");
    return { authorizationUrl: json.data.link, providerReference: params.reference };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
      headers: this.headers(),
    });
    const json = await res.json();
    if (!res.ok || json.status !== "success") throw new Error(json.message ?? "Failed to verify Flutterwave transaction");
    return {
      status: STATUS_MAP[String(json.data.status).toLowerCase()] ?? "PENDING",
      amount: json.data.amount,
      currency: json.data.currency,
      providerReference: json.data.tx_ref,
      paidAt: json.data.created_at ? new Date(json.data.created_at) : null,
    };
  }

  verifyWebhookSignature(_rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader || !this.credentials.webhookSecret) return false;
    return signatureHeader === this.credentials.webhookSecret;
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
    const body = JSON.parse(rawBody) as {
      event: string;
      data: { id: number; tx_ref: string; amount: number; currency: string; status: string };
    };
    const status = STATUS_MAP[String(body.data?.status).toLowerCase()] ?? null;
    return {
      type: status === "SUCCESSFUL" ? "PAYMENT_SUCCESSFUL" : status === "FAILED" ? "PAYMENT_FAILED" : null,
      reference: body.data?.tx_ref ?? null,
      providerEventId: String(body.data?.id ?? body.data?.tx_ref ?? ""),
      amount: body.data?.amount ?? null,
      currency: body.data?.currency ?? null,
      status,
    };
  }

  async initiateRefund(params: InitiateRefundParams): Promise<InitiateRefundResult> {
    const verifyRes = await fetch(
      `${BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(params.providerReference)}`,
      { headers: this.headers() }
    );
    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok || verifyJson.status !== "success") return { status: "FAILED", providerRefundReference: null };

    const res = await fetch(`${BASE_URL}/transactions/${verifyJson.data.id}/refund`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ amount: params.amount }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== "success") return { status: "FAILED", providerRefundReference: null };
    return { status: "PENDING", providerRefundReference: String(json.data.id ?? "") };
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const res = await fetch(`${BASE_URL}/transactions?page=1`, { headers: this.headers() });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, message: json.message ?? "Connection failed" };
      return { success: true, message: "Connected to Flutterwave successfully." };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Connection failed" };
    }
  }
}
