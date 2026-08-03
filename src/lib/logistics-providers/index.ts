import type { LogisticsProviderConnection } from "@prisma/client";
import { MockLogisticsProvider } from "@/lib/logistics-providers/mock-provider";
import type { LogisticsProvider } from "@/lib/logistics-providers/types";

export type { LogisticsProvider } from "@/lib/logistics-providers/types";

// Mirrors payment-providers/index.ts exactly — the single place that turns a
// stored LogisticsProviderConnection into a live LogisticsProvider instance.
// MANUAL never resolves here (it has no connection row, no API to call —
// staff enter tracking info directly, same as a MANUAL Payment). A future
// real courier adapter would decrypt connection.secretKeyEncrypted /
// webhookSecretEncrypted here (via lib/encryption.ts, same as payments) and
// pass them into its constructor — omitted for now since MOCK needs none.
export function resolveLogisticsProvider(connection: LogisticsProviderConnection): LogisticsProvider {
  switch (connection.provider) {
    case "MOCK":
      return new MockLogisticsProvider();
    default:
      throw new Error(`Unsupported logistics provider: ${connection.provider}`);
  }
}
