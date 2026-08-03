// ============================================================================
// FASHION360 PAYMENT ARCHITECTURE — SOURCE OF TRUTH
// ============================================================================
//
// This file exists so every place that displays payment-protection language
// to a customer or designer imports its wording from ONE place, instead of
// each screen inventing its own claim about what Fashion360 does or doesn't
// do with the money. It is the direct output of a capability audit against
// Paystack's and Flutterwave's CURRENT official documentation (not
// assumptions), done as part of the protected-payment-flow implementation.
//
// ---------------------------------------------------------------------------
// HOW MONEY ACTUALLY MOVES TODAY
// ---------------------------------------------------------------------------
// Fashion360 does not process payments on a platform-level merchant account.
// Each business connects ITS OWN Paystack/Flutterwave/Stripe account
// (PaymentGatewayConnection, with the business's own secret key). When a
// customer pays, the transaction is initialized directly against that
// business's own merchant account. The money settles to the BUSINESS's own
// bank account on the provider's standard schedule — for Paystack and
// Flutterwave in Nigeria, that is T+1 (next business day), automatically,
// with no mechanism for Fashion360 (or the business) to delay it.
//
// Fashion360 therefore never has custody of a customer's payment at any
// point. This is a deliberate architectural fact, not an oversight — see
// PROVIDER CAPABILITIES below for why.
//
// ---------------------------------------------------------------------------
// PROVIDER CAPABILITIES VERIFIED (current docs, checked live)
// ---------------------------------------------------------------------------
// Paystack:
//  - Subaccounts + Transaction Splits: real, documented. A transaction
//    initialized under a MAIN account can route a percentage/flat portion to
//    a subaccount. Settlement for BOTH the main account's share and the
//    subaccount's share happens on the SAME automatic schedule (T+1 typical
//    for NGN) — Paystack's own docs state settlement is "direct" to the
//    subaccount's bank account and does not pass through the main balance.
//    There is no parameter or product to hold/delay a subaccount's portion.
//  - Transfers + Transfer Recipients: real, documented, API-driven (no
//    hosted/embedded onboarding UI comparable to Stripe Connect Express —
//    Fashion360 would build its own form and call Paystack's "Resolve
//    Account Number" + "Create Transfer Recipient" endpoints).
//  - Refunds: real, per-transaction, via POST /refund against a transaction
//    reference. Processing fees are non-refundable per Paystack's own terms.
//  - Disputes/Chargebacks: real, but this is the CARD NETWORK / ISSUING BANK
//    disputing a charge with Paystack — a different concept from Fashion360's
//    own marketplace "customer reports a problem with the order" dispute.
//
// Flutterwave: materially the same shape — Split Payments/Subaccounts settle
// automatically (T+1 local / up to T+5-7 international) with no hold
// mechanism, and Flutterwave's own documentation states the marketplace
// owner bears chargeback/dispute liability for transactions routed through
// its subaccounts (a real compliance consideration if Fashion360 ever
// becomes the merchant of record).
//
// CONCLUSION: neither currently-integrated provider offers a way to hold or
// delay settlement of a payment (or a split portion of one) pending a
// business condition like "customer confirmed receipt" or "dispute window
// expired." Split payments and subaccounts change WHERE money goes, never
// WHEN. This rules out true escrow and true delayed payout under BOTH the
// current architecture (business-owned gateway) and a hypothetical
// platform-level-subaccount architecture, using either provider, as
// currently integrated.
//
// ---------------------------------------------------------------------------
// WHAT WOULD ACTUALLY ACHIEVE THE PROTECTED-PAYOUT FLOW
// ---------------------------------------------------------------------------
// The one real mechanism that works: Fashion360 becomes the merchant of
// record on its OWN platform-level Paystack/Flutterwave account (collecting
// the full payment itself, not the business), and separately, once its own
// business logic decides the order is payout-eligible, calls the provider's
// Transfer API to send the designer's share to their registered bank
// account. Between those two events, the money sits in Fashion360's own
// settled balance/bank account — under Fashion360's control, not a
// regulated escrow account, but genuinely capable of being withheld and
// released on Fashion360's own schedule.
//
// This requires: Fashion360 obtaining its own verified Paystack/Flutterwave
// business account, moving (or offering as an alternative to) the current
// per-business-gateway model, and building the Transfer/Recipient
// integration this codebase deliberately does NOT fake. It also means
// Fashion360 would bear first-line dispute/chargeback exposure for
// transactions it processes this way (see Flutterwave's own guidance
// above), which is a real business/compliance decision, not just an
// engineering one — it is documented here as the recommended next step, not
// implemented, because it cannot be done truthfully with a MOCK or
// unconfigured platform account.
//
// ---------------------------------------------------------------------------
// WHAT FASHION360 DOES INSTEAD (the honest v1 protection model)
// ---------------------------------------------------------------------------
// Fashion360 protects the transaction through PROCESS, not custody:
//  1. Payment is verified server-side against the provider before anything
//     is unlocked (never trusts a client callback).
//  2. Production cannot start until payment is verified successful.
//  3. A structured order-activity ledger, dispute process, and configurable
//     refund/cancellation policy exist regardless of who holds the money.
//  4. "Payout eligibility" is Fashion360's own internal bookkeeping gate
//     (order produced + delivered + confirmed/window-expired + no dispute)
//     — today it does not correspond to a real transfer of money BECAUSE
//     the business already has the funds the moment the customer pays. It
//     currently functions as a completion/accounting milestone, not a real
//     payout trigger, until the platform-account architecture above exists.
//  5. Refunds are real (call the business's connected gateway's Refund API,
//     verified server-side, never marked successful without provider
//     confirmation).

export const PAYMENT_ARCHITECTURE_SUMMARY = {
  fashion360HoldsFunds: false,
  trueEscrowSupported: false,
  trueDelayedPayoutSupported: false,
  settlementDestination: "business's own connected payment gateway account" as const,
  settlementTiming: "provider's standard automatic schedule (T+1 typical for NGN, outside Fashion360's control)" as const,
};

// The one and only customer-facing sentence describing payment protection —
// every payment screen/notification should reference this, not write its
// own claim.
export const PAYMENT_PROTECTION_STATEMENT =
  "Your payment is processed securely through your designer's connected payment provider. Fashion360 verifies every payment directly with the provider before production can begin, and protects your order through our dispute and refund process. Payment does not guarantee production has started until it shows as confirmed here.";

export const DESIGNER_PAYMENT_STATEMENT =
  "Payment is verified directly with the provider before you're notified to begin production. Funds settle to your own connected payment account on your provider's normal schedule. Fashion360 does not hold or delay your funds.";
