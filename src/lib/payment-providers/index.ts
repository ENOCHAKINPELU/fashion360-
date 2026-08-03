import type { PaymentGatewayConnection } from "@prisma/client";
import { decryptSecret } from "@/lib/encryption";
import { MockProvider } from "@/lib/payment-providers/mock-provider";
import { PaystackProvider } from "@/lib/payment-providers/paystack-provider";
import { FlutterwaveProvider } from "@/lib/payment-providers/flutterwave-provider";
import { StripeProvider } from "@/lib/payment-providers/stripe-provider";
import type { PaymentProvider, PaymentProviderCredentials } from "@/lib/payment-providers/types";

export type { PaymentProvider } from "@/lib/payment-providers/types";

// The single place that turns a stored PaymentGatewayConnection into a live
// PaymentProvider instance, decrypting its secrets on the way in. Nothing
// outside this module (and encryption.ts) ever sees a plaintext secret key.
export function resolvePaymentProvider(connection: PaymentGatewayConnection): PaymentProvider {
  const credentials: PaymentProviderCredentials = {
    publicKey: connection.publicKey,
    secretKey: connection.secretKeyEncrypted ? decryptSecret(connection.secretKeyEncrypted) : null,
    webhookSecret: connection.webhookSecretEncrypted ? decryptSecret(connection.webhookSecretEncrypted) : null,
    currency: connection.currency,
  };

  switch (connection.provider) {
    case "PAYSTACK":
      return new PaystackProvider(credentials);
    case "FLUTTERWAVE":
      return new FlutterwaveProvider(credentials);
    case "STRIPE":
      return new StripeProvider(credentials);
    case "MOCK":
      return new MockProvider();
    default:
      throw new Error(`Unsupported payment provider: ${connection.provider}`);
  }
}
