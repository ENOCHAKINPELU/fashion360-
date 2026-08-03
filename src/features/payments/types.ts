export interface PaymentGatewayConnectionData {
  id: string;
  provider: string;
  publicKey: string | null;
  secretKeyMasked: string | null;
  webhookConfigured: boolean;
  currency: string;
  status: string;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  connectedBy: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
}

export interface FinancialTransactionData {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  currency: string | null;
  method: string | null;
  reference: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  actorType: string;
  actor: { name: string | null } | null;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string } | null;
  order: { id: string; orderCode: string } | null;
  invoice: { id: string; invoiceNumber: string } | null;
}

export interface RefundListItem {
  id: string;
  amount: number;
  type: string;
  reason: string;
  status: string;
  processedAt: string | null;
  createdAt: string;
  processedBy: { name: string | null } | null;
  payment: {
    invoice: { invoiceNumber: string };
    customer: { firstName: string; lastName: string };
    currency: string;
  };
}

export interface FinancialDashboardStats {
  totalRevenue: number;
  paidAmount: number;
  pendingPayments: number;
  outstandingBalance: number;
  overduePayments: number;
  totalQuotations: number;
  acceptedQuotations: number;
  pendingQuotations: number;
  declinedQuotations: number;
  totalInvoices: number;
  paidInvoices: number;
  partiallyPaidInvoices: number;
  unpaidInvoices: number;
  refunds: number;
}
