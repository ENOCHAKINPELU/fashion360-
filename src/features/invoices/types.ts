import type { FinancialCustomerOption, FinancialOrderOption, FinancialLineItemData, FinancialShareData } from "@/features/quotations/types";

export type { FinancialCustomerOption, FinancialOrderOption, FinancialLineItemData, FinancialShareData };

export interface PaymentMilestoneData {
  id: string;
  label: string;
  percentage: number | null;
  amount: number;
  dueDate: string | null;
  status: string;
  sortOrder: number;
  paymentId: string | null;
  paidAt: string | null;
}

export interface PaymentScheduleData {
  id: string;
  milestones: PaymentMilestoneData[];
}

export interface ReceiptData {
  id: string;
  receiptNumber: string;
  pdfUrl: string | null;
  createdAt: string;
}

export interface RefundData {
  id: string;
  amount: number;
  type: string;
  reason: string;
  status: string;
  processedAt: string | null;
  createdAt: string;
}

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  providerReference: string | null;
  status: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  recordedBy: { name: string | null } | null;
  receipt: ReceiptData | null;
  refunds: RefundData[];
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  order: FinancialOrderOption;
  customer: FinancialCustomerOption;
}

export interface InvoiceDetailData extends InvoiceListItem {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  additionalCharges: number;
  paymentInstructions: string | null;
  paymentTerms: string | null;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
  alterationPolicy: string | null;
  deliveryPolicy: string | null;
  customTerms: string | null;
  sentAt: string | null;
  firstViewedAt: string | null;
  voidedAt: string | null;
  quotation: { id: string; quotationNumber: string } | null;
  items: FinancialLineItemData[];
  paymentSchedule: PaymentScheduleData | null;
  payments: PaymentData[];
  shares: FinancialShareData[];
}

export interface InvoiceDashboardStats {
  total: number;
  paid: number;
  partiallyPaid: number;
  unpaid: number;
}
