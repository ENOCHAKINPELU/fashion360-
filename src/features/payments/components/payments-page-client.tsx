"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GatewaySettings } from "@/features/payments/components/gateway-settings";
import { TransactionsTable } from "@/features/payments/components/transactions-table";
import { RefundsTable } from "@/features/payments/components/refunds-table";
import type { PaymentGatewayConnectionData, FinancialTransactionData, RefundListItem } from "@/features/payments/types";

export function PaymentsPageClient({
  businessId,
  currency,
  statsSlot,
  chartsSlot,
  connections,
  transactions,
  refunds,
}: {
  businessId: string;
  currency: string;
  statsSlot: React.ReactNode;
  chartsSlot: React.ReactNode;
  connections: PaymentGatewayConnectionData[];
  transactions: FinancialTransactionData[];
  refunds: RefundListItem[];
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="gateway">Payment Gateway</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="refunds">Refunds</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 pt-4">
        {statsSlot}
        {chartsSlot}
      </TabsContent>

      <TabsContent value="gateway" className="pt-4">
        <GatewaySettings connections={connections} businessId={businessId} />
      </TabsContent>

      <TabsContent value="transactions" className="pt-4">
        <TransactionsTable transactions={transactions} currency={currency} />
      </TabsContent>

      <TabsContent value="refunds" className="pt-4">
        <RefundsTable refunds={refunds} />
      </TabsContent>
    </Tabs>
  );
}
