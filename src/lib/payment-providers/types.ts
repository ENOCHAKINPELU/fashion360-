import type { WebhookEventType } from "@prisma/client";

// The common interface every gateway integration implements. The rest of
// the app (payment-link creation, webhook processing, refunds) only ever
// talks to this shape — never to a specific provider's SDK/REST API
// directly — so adding a new provider later never touches call sites
// (section 34 of the Phase 8 spec).
export interface PaymentProviderCredentials {
  publicKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  currency: string;
}

export interface InitializePaymentParams {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  providerReference: string;
}

export interface VerifyPaymentResult {
  status: "SUCCESSFUL" | "FAILED" | "PENDING";
  amount: number;
  currency: string;
  providerReference: string;
  paidAt: Date | null;
}

export interface ParsedWebhookEvent {
  type: WebhookEventType | null;
  reference: string | null;
  providerEventId: string;
  amount: number | null;
  currency: string | null;
  status: "SUCCESSFUL" | "FAILED" | "PENDING" | "REVERSED" | null;
}

export interface InitiateRefundParams {
  providerReference: string;
  amount: number;
  currency: string;
}

export interface InitiateRefundResult {
  status: "SUCCESSFUL" | "PENDING" | "FAILED";
  providerRefundReference: string | null;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export interface PaymentProvider {
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent;
  initiateRefund(params: InitiateRefundParams): Promise<InitiateRefundResult>;
  testConnection(): Promise<TestConnectionResult>;
}
