import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskSecret, decryptSecret } from "@/lib/encryption";
import { FinancialDashboardStats } from "@/features/payments/components/financial-dashboard-stats";
import { FinancialCharts } from "@/features/payments/components/financial-charts";
import { PaymentsPageClient } from "@/features/payments/components/payments-page-client";

export default async function PaymentsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [business, connections, transactions, refunds] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { currency: true } }),
    prisma.paymentGatewayConnection.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      include: { connectedBy: { select: { name: true } } },
    }),
    prisma.financialTransaction.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { name: true } } },
    }),
    prisma.refund.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        payment: { include: { invoice: { select: { invoiceNumber: true } }, customer: { select: { firstName: true, lastName: true } } } },
        processedBy: { select: { name: true } },
      },
    }),
  ]);

  const [customerIds, orderIds, invoiceIds] = [
    [...new Set(transactions.map((t) => t.customerId).filter((v): v is string => !!v))],
    [...new Set(transactions.map((t) => t.orderId).filter((v): v is string => !!v))],
    [...new Set(transactions.map((t) => t.invoiceId).filter((v): v is string => !!v))],
  ];
  const [customers, orders, invoices] = await Promise.all([
    prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, firstName: true, lastName: true } }),
    prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderCode: true } }),
    prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceNumber: true } }),
  ]);
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  const transactionsData = transactions.map((t) => ({
    ...t,
    customer: t.customerId ? (customerMap.get(t.customerId) ?? null) : null,
    order: t.orderId ? (orderMap.get(t.orderId) ?? null) : null,
    invoice: t.invoiceId ? (invoiceMap.get(t.invoiceId) ?? null) : null,
  }));

  const connectionsData = connections.map((c) => ({
    id: c.id,
    provider: c.provider,
    publicKey: c.publicKey,
    secretKeyMasked: c.secretKeyEncrypted ? maskSecret(decryptSecret(c.secretKeyEncrypted)) : null,
    webhookConfigured: Boolean(c.webhookSecretEncrypted),
    currency: c.currency,
    status: c.status,
    isActive: c.isActive,
    lastTestedAt: c.lastTestedAt,
    lastTestResult: c.lastTestResult,
    connectedBy: c.connectedBy?.name ?? null,
    connectedAt: c.connectedAt,
    disconnectedAt: c.disconnectedAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Financial overview, your connected payment gateway, and the full transaction history.
        </p>
      </div>

      <PaymentsPageClient
        businessId={businessId}
        currency={business.currency}
        statsSlot={<FinancialDashboardStats businessId={businessId} currency={business.currency} />}
        chartsSlot={<FinancialCharts businessId={businessId} currency={business.currency} />}
        connections={JSON.parse(JSON.stringify(connectionsData))}
        transactions={JSON.parse(JSON.stringify(transactionsData))}
        refunds={JSON.parse(JSON.stringify(refunds))}
      />
    </div>
  );
}
