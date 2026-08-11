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
import { createCharge, getCharge, refundCharge, verifyChargeWebhookSignature, listBanks } from "@/lib/flutterwave";

const STATUS_MAP: Record<string, VerifyPaymentResult["status"]> = {
  succeeded: "SUCCESSFUL",
  failed: "FAILED",
};

// The ONE Flutterwave account Fashion360 itself holds (see flutterwave.ts).
// Unlike every other class in this folder, this one is never built from a
// business's PaymentGatewayConnection — createInvoicePaymentLink constructs
// it directly, unconditionally, because businesses never connect a gateway
// of their own (same principle as lib/payout-recipients.ts on the payout
// side: a business provides a bank account, never an API key). Money
// collected here sits in Fashion360's own Flutterwave balance until
// lib/payout.ts's executePayoutTransfer moves a business's share out.
export class PlatformFlutterwaveProvider implements PaymentProvider {
  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const charge = await createCharge({
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      redirectUrl: params.callbackUrl,
      customerEmail: params.email,
    });
    if (!charge.redirectUrl) throw new Error("Flutterwave did not return a checkout link for this charge");
    // providerReference is the charge id (chg_...), not our own merchant
    // reference — that's what GET /charges/{id} and the webhook payload key
    // off, and what Payment.providerReference stores from here on.
    return { authorizationUrl: charge.redirectUrl, providerReference: charge.id };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const charge = await getCharge(reference);
    return {
      status: STATUS_MAP[charge.status] ?? "PENDING",
      amount: charge.amount,
      currency: charge.currency,
      providerReference: charge.id,
      paidAt: STATUS_MAP[charge.status] === "SUCCESSFUL" ? new Date() : null,
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    return verifyChargeWebhookSignature(rawBody, signatureHeader);
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
    const body = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data: { id: string; status: string; amount: number; currency: string };
    };
    const status = STATUS_MAP[String(body.data?.status).toLowerCase()] ?? null;
    return {
      type: status === "SUCCESSFUL" ? "PAYMENT_SUCCESSFUL" : status === "FAILED" ? "PAYMENT_FAILED" : null,
      // The charge id, matching what's stored as Payment.providerReference —
      // NOT Flutterwave's own merchant-facing "reference" field.
      reference: body.data?.id ?? null,
      providerEventId: body.id || body.data?.id || "",
      amount: body.data?.amount ?? null,
      currency: body.data?.currency ?? null,
      status,
    };
  }

  async initiateRefund(params: InitiateRefundParams): Promise<InitiateRefundResult> {
    const refund = await refundCharge({ chargeId: params.providerReference, amount: params.amount });
    const status: InitiateRefundResult["status"] =
      refund.status === "succeeded" || refund.status === "completed" ? "SUCCESSFUL" : refund.status === "failed" ? "FAILED" : "PENDING";
    return { status, providerRefundReference: refund.id };
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      await listBanks("NG");
      return { success: true, message: "Connected to Fashion360's platform Flutterwave account." };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Connection failed" };
    }
  }
}
