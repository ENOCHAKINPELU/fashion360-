import { randomUUID } from "crypto";
import type {
  LogisticsProvider,
  DeliveryQuoteParams,
  DeliveryQuoteResult,
  CreateDeliveryParams,
  CreateDeliveryResult,
  TrackingStatusResult,
  ParsedDeliveryWebhookEvent,
  CancelShipmentResult,
  TestConnectionResult,
} from "@/lib/logistics-providers/types";

// Dev/demo provider so the full delivery flow (create -> tracking number ->
// status progression -> delivered) can be exercised with zero real courier
// credentials — mirrors payment-providers/mock-provider.ts exactly. Status
// progression itself isn't simulated automatically here (there's no real
// courier pushing webhooks); staff advance a Mock delivery the same way they
// would a Manual one, via POST /api/deliveries/[id]/events.
export class MockLogisticsProvider implements LogisticsProvider {
  async getQuote(params: DeliveryQuoteParams): Promise<DeliveryQuoteResult> {
    const base = 1500;
    const perKg = params.packageWeightKg ? Math.ceil(params.packageWeightKg) * 300 : 0;
    return { cost: base + perKg, currency: "NGN", estimatedDays: 3 };
  }

  async createDelivery(_params: CreateDeliveryParams): Promise<CreateDeliveryResult> {
    const providerDeliveryId = `mock_delivery_${randomUUID()}`;
    const trackingNumber = `MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      providerDeliveryId,
      trackingNumber,
      trackingUrl: `https://example-courier.test/track/${trackingNumber}`,
      deliveryCost: 1500,
      estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  async getTrackingStatus(_providerDeliveryId: string): Promise<TrackingStatusResult> {
    return { status: "CREATED", location: null, description: "Awaiting courier pickup", occurredAt: new Date() };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  parseWebhookEvent(rawBody: string): ParsedDeliveryWebhookEvent {
    const data = JSON.parse(rawBody) as {
      providerEventId?: string;
      providerDeliveryId?: string;
      trackingNumber?: string;
      status?: string;
      description?: string;
      location?: string;
    };
    return {
      type: "STATUS_UPDATE",
      providerEventId: data.providerEventId ?? randomUUID(),
      providerDeliveryId: data.providerDeliveryId ?? null,
      trackingNumber: data.trackingNumber ?? null,
      status: (data.status as ParsedDeliveryWebhookEvent["status"]) ?? null,
      description: data.description ?? null,
      location: data.location ?? null,
    };
  }

  async cancelShipment(): Promise<CancelShipmentResult> {
    return { success: true, message: "Mock shipment cancelled." };
  }

  async testConnection(): Promise<TestConnectionResult> {
    return { success: true, message: "Mock logistics provider is always reachable (dev/demo only)." };
  }
}
