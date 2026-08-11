// ============================================================================
// FASHION360 PAYMENT ARCHITECTURE — SOURCE OF TRUTH
// ============================================================================
//
// This file exists so every place that displays payment-protection language
// to a customer or designer imports its wording from ONE place, instead of
// each screen inventing its own claim about what Fashion360 does or doesn't
// do with the money.
//
// ---------------------------------------------------------------------------
// HOW MONEY ACTUALLY MOVES TODAY
// ---------------------------------------------------------------------------
// Fashion360 collects payment on its OWN platform-level Flutterwave account
// (see lib/flutterwave.ts, lib/payment-providers/platform-flutterwave-provider.ts)
// — a business is never asked to connect a payment gateway or hand over an
// API key. When a customer pays, the money lands in Fashion360's own
// Flutterwave balance, not the business's. It stays there under
// Fashion360's control until its own business logic (lib/payout.ts:
// evaluatePayoutEligibility) decides the order is payout-eligible — order
// fulfilled, delivered, and either customer-confirmed or the dispute window
// expired, with no open dispute — at which point an admin triggers a real
// Flutterwave Transfer (lib/payout.ts: executePayoutTransfer) that moves
// the business's share to the bank account it registered
// (lib/payout-recipients.ts). Nothing about this is simulated: both the
// charge collection and the transfer are real Flutterwave v4 API calls
// against a real account.
//
// This IS genuine custody-based protection, not merely process-based: the
// money is verifiably out of the business's reach until Fashion360 chooses
// to release it. It is still not a regulated escrow account (no licensed
// third-party escrow agent, no segregated trust account) — it is
// Fashion360's own operating balance, held and released on Fashion360's own
// schedule and business logic. That distinction matters for what can
// honestly be claimed to a customer or a regulator, which is why it's
// spelled out here instead of asserting "escrow."
//
// This is a change from V1's original architecture, where each business
// connected its own gateway and Fashion360 never touched the money at all
// (that model, and PaymentGatewayConnection/the per-business gateway
// provider classes in lib/payment-providers, still exist in the schema but
// are no longer how a business gets paid — see git history around the
// "Real Flutterwave v4 payout transfers" and customer-charge-collection
// commits for when and why this changed).
//
// ---------------------------------------------------------------------------
// WHAT'S STILL A CONSTRAINT
// ---------------------------------------------------------------------------
// - NGN only. The one charge type currently wired up (payment_method.type
//   "bank_account", see flutterwave.ts) is Nigeria-specific; an invoice in
//   any other currency falls back to the honest "online payment isn't
//   available, contact the business" path rather than pretending to work.
// - No automatic transfer trigger yet. executePayoutTransfer is
//   admin-triggered from /admin/payouts, not fired automatically the
//   instant an order becomes eligible — an eligible payout can sit
//   unactioned until an admin looks at the queue. There's no SLA on that
//   today.
// - Refunds go through the same platform account (lib/flutterwave.ts:
//   refundCharge), independently of whether that order's payout has
//   already been transferred out to the business — a refund issued after
//   payout has already moved the money out is not automatically clawed
//   back from the business; that reconciliation is manual today.
// - Fashion360 is now the first line for chargeback/dispute liability on
//   every charge it collects (this is Flutterwave's own documented
//   position for whoever is the merchant of record), which it wasn't under
//   the old per-business-gateway model. This is a real compliance/business
//   consideration, not just an engineering one.
//
// ---------------------------------------------------------------------------
// HOW THE TRANSACTION IS STILL PROTECTED BEYOND CUSTODY
// ---------------------------------------------------------------------------
//  1. Payment is verified server-side against Flutterwave before anything
//     is unlocked (never trusts a client redirect/callback alone — see
//     lib/payment-link.ts: pollFlutterwaveChargeStatus and the webhook
//     route's independent re-verify step).
//  2. Production cannot start until payment is verified successful.
//  3. A structured order-activity ledger, dispute process, and configurable
//     refund/cancellation policy exist on top of the custody model.
//  4. "Payout eligibility" (lib/payout.ts) gates the one real lever
//     Fashion360 now has — whether to release the money it's actually
//     holding — rather than being pure bookkeeping with no teeth, as it was
//     before this architecture existed.

export const PAYMENT_ARCHITECTURE_SUMMARY = {
  fashion360HoldsFunds: true,
  trueEscrowSupported: false,
  trueDelayedPayoutSupported: true,
  settlementDestination: "business's registered bank account, via a Fashion360-initiated transfer" as const,
  settlementTiming: "admin-triggered, once the order is payout-eligible (fulfilled, delivered, confirmed or dispute window expired, no open dispute)" as const,
};

// The one and only customer-facing sentence describing payment protection —
// every payment screen/notification should reference this, not write its
// own claim.
export const PAYMENT_PROTECTION_STATEMENT =
  "Your payment is collected securely by Fashion360 and verified before production can begin. Fashion360 holds the funds and releases your designer's share only once your order is fulfilled and confirmed, protecting you if something goes wrong through our dispute and refund process.";

export const DESIGNER_PAYMENT_STATEMENT =
  "Payment is collected by Fashion360, not you — no payment gateway or API key needed on your end. Once an order is fulfilled, delivered, and confirmed (or the confirmation window passes with no dispute), Fashion360 transfers your share to the bank account you registered.";
