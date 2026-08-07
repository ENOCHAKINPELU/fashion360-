// ============================================================================
// FASHION360 LOGISTICS ARCHITECTURE — SOURCE OF TRUTH
// ============================================================================
//
// Written for the same reason as payment-architecture.ts: every place that
// talks to a business or customer about delivery tracking should describe
// what's real today from ONE place, not invent its own claim. This file did
// not exist before the V1 readiness audit that flagged it — the underlying
// architecture was already honest (LogisticsProviderType only ever offered
// MOCK and MANUAL, never a fake "real courier" option), it just wasn't
// written down anywhere a non-engineer could read it.
//
// ---------------------------------------------------------------------------
// WHAT EXISTS TODAY
// ---------------------------------------------------------------------------
// LogisticsProviderConnection supports exactly two provider types:
//
//   MOCK   — src/lib/logistics-providers/mock-provider.ts. Simulates a
//            courier for demos and local development: instant fake tracking
//            numbers, no real pickup ever happens.
//
//   MANUAL — no API calls at all. The business updates delivery status
//            themselves (dispatched, in transit, delivered) because they're
//            handling their own courier, rider, or in-person handoff outside
//            any integrated system. This is the realistic mode for a V1
//            business today, not a fallback — most fashion businesses at
//            this stage use a personal rider or a local dispatch service
//            with no public tracking API anyway.
//
// The customer-facing side (delivery status display, confirm-delivery,
// report-a-problem, delivery disputes) is fully real regardless of which
// mode is behind it — none of that is simulated, only the courier
// integration itself is.
//
// ---------------------------------------------------------------------------
// WHAT DOESN'T EXIST YET
// ---------------------------------------------------------------------------
// No real courier's API (Sendbox, GIG Logistics, Kwik, DHL, or any other) is
// integrated. The LogisticsProvider interface (logistics-providers/types.ts)
// mirrors the payment-provider interface exactly for this reason — quote,
// create delivery, track, verify + parse webhook, cancel, test connection —
// specifically so a real provider slots in later without any call site in
// the app changing. That interface has never been implemented against a
// real courier's REST API; it currently has one implementation (Mock).
//
// ---------------------------------------------------------------------------
// WHAT ADDING A REAL PROVIDER REQUIRES
// ---------------------------------------------------------------------------
// 1. Add the provider to the LogisticsProviderType enum (a migration).
// 2. Implement LogisticsProvider against that courier's actual REST API —
//    getQuote, createDelivery, getTrackingStatus, verifyWebhookSignature,
//    parseWebhookEvent, cancelShipment, testConnection — following the exact
//    pattern already established in mock-provider.ts and, on the payment
//    side, the real Paystack/Flutterwave provider implementations.
// 3. A business connects it the same way they connect a payment gateway
//    today: enter credentials in Settings, POST to test the connection,
//    the existing webhook route at
//    /api/deliveries/webhook/[provider]/[businessId] already verifies
//    signatures generically and needs no change to accept a new provider.
// 4. No customer- or business-facing UI needs to change — the delivery
//    status timeline, tracking display, and confirmation flow all already
//    read from the provider-agnostic Delivery/DeliveryEvent models.
//
// ---------------------------------------------------------------------------
// THE ONE CUSTOMER-FACING SENTENCE
// ---------------------------------------------------------------------------
export const LOGISTICS_CAPABILITY_STATEMENT =
  "Delivery tracking reflects the status your designer's business enters or, where a courier integration exists, receives directly from that courier — Fashion360 does not independently verify a package's physical location.";
