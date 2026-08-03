import { randomUUID } from "crypto";
import type {
  PaymentProvider,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
  ParsedWebhookEvent,
  InitiateRefundParams,
  InitiateRefundResult,
  TestConnectionResult,
} from "@/lib/payment-providers/types";

// Dev/demo provider so the full pay flow (link -> "gateway" -> callback ->
// invoice update) can be exercised with zero real credentials. Never used
// once a business connects a real provider (PAYMENT_PROVIDER=mock is only
// ever the platform-wide default fallback, and is not a valid value a
// business can pick when connecting a gateway in Settings). The "gateway" is
// our own /api/payments/mock/checkout route, which immediately settles the
// payment and redirects back — simulating a real provider's hosted
// checkout + redirect without leaving the app.
export class MockProvider implements PaymentProvider {
  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const providerReference = `mock_${randomUUID()}`;
    const url = new URL("/api/payments/mock/checkout", process.env.AUTH_URL ?? "http://localhost:3000");
    url.searchParams.set("reference", params.reference);
    url.searchParams.set("providerReference", providerReference);
    url.searchParams.set("amount", String(params.amount));
    url.searchParams.set("callbackUrl", params.callbackUrl);
    return { authorizationUrl: url.toString(), providerReference };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    return { status: "SUCCESSFUL", amount: 0, currency: "NGN", providerReference: reference, paidAt: new Date() };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
    const data = JSON.parse(rawBody) as { reference?: string; providerEventId?: string; amount?: number };
    return {
      type: "PAYMENT_SUCCESSFUL",
      reference: data.reference ?? null,
      providerEventId: data.providerEventId ?? randomUUID(),
      amount: data.amount ?? null,
      currency: "NGN",
      status: "SUCCESSFUL",
    };
  }

  async initiateRefund(params: InitiateRefundParams): Promise<InitiateRefundResult> {
    return { status: "SUCCESSFUL", providerRefundReference: `mock_refund_${randomUUID()}` };
  }

  async testConnection(): Promise<TestConnectionResult> {
    return { success: true, message: "Mock provider is always reachable (dev/demo only)." };
  }
}
