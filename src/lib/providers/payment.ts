/**
 * Swappable payment gateway boundary. The mock provider is the only implementation
 * wired up today; drop in Paystack/Flutterwave/Stripe by implementing this interface
 * and switching PAYMENT_PROVIDER in env — no call sites elsewhere need to change.
 */
export interface PaymentChargeRequest {
  amount: number;
  currency: string;
  reference: string;
  customerEmail?: string | null;
}

export interface PaymentChargeResult {
  providerRef: string;
  status: "PAID" | "PENDING" | "FAILED";
  checkoutUrl?: string;
}

export interface PaymentProvider {
  name: string;
  charge(req: PaymentChargeRequest): Promise<PaymentChargeResult>;
  refund(providerRef: string, amount: number): Promise<{ status: "REFUNDED" | "FAILED" }>;
}

class MockPaymentProvider implements PaymentProvider {
  name = "mock";

  async charge(req: PaymentChargeRequest): Promise<PaymentChargeResult> {
    return {
      providerRef: `mock_${req.reference}`,
      status: "PAID",
    };
  }

  async refund() {
    return { status: "REFUNDED" as const };
  }
}

export function getPaymentProvider(): PaymentProvider {
  // Real providers (Paystack/Flutterwave/Stripe) plug in here based on
  // process.env.PAYMENT_PROVIDER once a merchant account is configured.
  return new MockPaymentProvider();
}
