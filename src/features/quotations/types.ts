export interface FinancialCustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  customerCode: string;
  phone: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
}

export interface FinancialOrderOption {
  id: string;
  orderCode: string;
  totalValue: number;
  expectedCompletionDate: string | null;
}

export interface FinancialLineItemData {
  id: string;
  type: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
  sortOrder: number;
}

export interface QuotationVersionData {
  id: string;
  versionNumber: number;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  additionalCharges: number;
  total: number;
  depositPercentage: number;
  depositRequired: number;
  balanceDue: number;
  paymentTerms: string | null;
  balanceDueDate: string | null;
  productionStartConditions: string | null;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
  alterationPolicy: string | null;
  deliveryPolicy: string | null;
  customTerms: string | null;
  changesSummary: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string | null } | null;
  items: FinancialLineItemData[];
}

export interface QuotationRevisionRequestData {
  id: string;
  versionId: string | null;
  body: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface QuotationCommentData {
  id: string;
  versionId: string | null;
  authorType: string;
  author: { name: string | null } | null;
  body: string;
  createdAt: string;
}

export interface QuotationApprovalData {
  id: string;
  versionId: string;
  decision: string;
  decidedAt: string;
}

export interface FinancialShareData {
  id: string;
  token: string;
  channel: string;
  expiresAt: string | null;
  revokedAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

export interface QuotationListItem {
  id: string;
  quotationNumber: string;
  status: string;
  latestVersionNumber: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  order: FinancialOrderOption | null;
  customer: FinancialCustomerOption;
  versions: { versionNumber: number; total: number }[];
}

export interface QuotationDetailData extends Omit<QuotationListItem, "versions"> {
  sentAt: string | null;
  firstViewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  versions: QuotationVersionData[];
  comments: QuotationCommentData[];
  revisionRequests: QuotationRevisionRequestData[];
  approvals: QuotationApprovalData[];
  shares: FinancialShareData[];
  invoice: { id: string; invoiceNumber: string; status: string } | null;
}

export interface QuotationDashboardStats {
  total: number;
  accepted: number;
  pending: number;
  declined: number;
}
