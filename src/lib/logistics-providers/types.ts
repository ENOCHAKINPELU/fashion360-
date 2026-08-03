import type { DeliveryStatus, DeliveryEventType } from "@prisma/client";

// Mirrors payment-providers/types.ts exactly — the rest of the app (delivery
// creation, tracking refresh, webhook processing) only ever talks to this
// shape, never a specific courier's SDK/REST API directly, so adding a real
// provider later never touches call sites.
export interface LogisticsProviderCredentials {
  publicKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
}

export interface DeliveryQuoteParams {
  pickupAddress: string;
  deliveryAddress: string;
  packageWeightKg?: number | null;
}

export interface DeliveryQuoteResult {
  cost: number;
  currency: string;
  estimatedDays: number | null;
}

export interface CreateDeliveryParams {
  reference: string;
  pickupAddress: string;
  deliveryAddress: string;
  customerContactName?: string | null;
  customerContactPhone?: string | null;
  packageDescription?: string | null;
  packageWeightKg?: number | null;
  packageDimensions?: string | null;
  callbackUrl: string;
}

export interface CreateDeliveryResult {
  providerDeliveryId: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  deliveryCost: number | null;
  estimatedDeliveryDate: Date | null;
}

export interface TrackingStatusResult {
  status: DeliveryStatus;
  location: string | null;
  description: string | null;
  occurredAt: Date;
}

export interface ParsedDeliveryWebhookEvent {
  type: DeliveryEventType | null;
  providerEventId: string;
  providerDeliveryId: string | null;
  trackingNumber: string | null;
  status: DeliveryStatus | null;
  description: string | null;
  location: string | null;
}

export interface CancelShipmentResult {
  success: boolean;
  message: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export interface LogisticsProvider {
  getQuote(params: DeliveryQuoteParams): Promise<DeliveryQuoteResult>;
  createDelivery(params: CreateDeliveryParams): Promise<CreateDeliveryResult>;
  getTrackingStatus(providerDeliveryId: string): Promise<TrackingStatusResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  parseWebhookEvent(rawBody: string): ParsedDeliveryWebhookEvent;
  cancelShipment(providerDeliveryId: string): Promise<CancelShipmentResult>;
  testConnection(): Promise<TestConnectionResult>;
}
