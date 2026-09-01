export interface OrderCustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  customerCode: string;
  phone: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
}

export interface OrderDesignOption {
  id: string;
  designCode: string;
  name: string;
  mainImageUrl: string | null;
  basePrice: number | null;
  category: { id: string; name: string } | null;
  collection: { id: string; name: string } | null;
  description: string | null;
}

export interface OrderMeasurementProfileOption {
  id: string;
  name: string;
  isDefault: boolean;
  updatedAt: string;
  latestMeasurement: {
    id: string;
    unit: string;
    fitPreference: string | null;
    values: Record<string, number>;
    templateName: string | null;
  } | null;
}

export interface OrderUserOption {
  id: string;
  name: string | null;
  image: string | null;
}

export interface OrderCustomizationData {
  fabricId: string | null;
  fabricNameSnapshot: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  sleeveStyle: string | null;
  neckline: string | null;
  collarStyle: string | null;
  length: string | null;
  buttonStyle: string | null;
  embroidery: string | null;
  pocketStyle: string | null;
  cuffStyle: string | null;
  lining: string | null;
  accessories: string[];
  customInstructions: string | null;
  referenceImages: string[];
}

export interface OrderItemDesignPreviewSummary {
  id: string;
  previewCode: string;
  status: string;
  previewType: string;
  latestVersionNumber: number;
  revisionCount: number;
}

export interface OrderItemData {
  id: string;
  designId: string | null;
  designNameSnapshot: string | null;
  designImageSnapshot: string | null;
  designCategorySnapshot: string | null;
  isCustomDesign: boolean;
  customDesignDescription: string | null;
  quantity: number;
  basePrice: number;
  fabricCost: number;
  customizationCost: number;
  additionalServicesCost: number;
  subtotal: number;
  customization: OrderCustomizationData | null;
  designPreview: OrderItemDesignPreviewSummary | null;
}

export interface OrderListItem {
  id: string;
  orderCode: string;
  orderType: string;
  status: string;
  priority: string;
  paymentStatus: string;
  currentStage: string | null;
  orderDate: string;
  expectedCompletionDate: string | null;
  eventDate: string | null;
  totalValue: number;
  balanceDue: number;
  isArchived: boolean;
  createdAt: string;
  customer: OrderCustomerOption;
  assignedDesigner: OrderUserOption | null;
  items: { designNameSnapshot: string | null; designCategorySnapshot: string | null }[];
}

export interface OrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  orderType?: string;
  priority?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  archived?: string;
}

export interface OrderTimelineEntryData {
  id: string;
  stage: string;
  status: string;
  isApplicable: boolean;
  occurredAt: string | null;
  note: string | null;
  sortOrder: number;
  actor: { name: string | null } | null;
}

export interface OrderProductionStageData {
  id: string;
  templateId: string | null;
  name: string;
  status: string;
  sortOrder: number;
  startDate: string | null;
  completionDate: string | null;
  notes: string | null;
  photos: string[];
  completedBy: { name: string | null } | null;
  files: { id: string; url: string; name: string }[];
}

export interface OrderNoteData {
  id: string;
  category: string;
  body: string;
  createdAt: string;
  author: { name: string | null } | null;
}

export interface OrderFileData {
  id: string;
  category: string;
  url: string;
  name: string;
  fileType: string | null;
  createdAt: string;
  uploadedBy: { name: string | null } | null;
}

export interface FittingSessionData {
  id: string;
  fittingDate: string;
  status: string;
  fitIssues: string | null;
  requiredAdjustments: string | null;
  designerComments: string | null;
  customerComments: string | null;
  photos: string[];
  createdAt: string;
  alterations: AlterationData[];
}

export interface AlterationData {
  id: string;
  fittingSessionId: string | null;
  issue: string;
  requiredChange: string;
  description: string | null;
  status: string;
  expectedCompletionDate: string | null;
  completedAt: string | null;
  notes: string | null;
  cycleNumber: number;
  createdAt: string;
}

export interface OrderActivityData {
  id: string;
  type: string;
  title: string;
  description: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor: { name: string | null } | null;
}

export interface OrderDetailData extends OrderListItem {
  measurementProfileId: string | null;
  measurementSnapshot: Record<string, number> | null;
  occasion: string | null;
  deliveryMethod: string;
  deliveryAddress: string | null;
  customerNotes: string | null;
  designerNotes: string | null;
  privateNotes: string | null;
  fabricCost: number;
  customizationCost: number;
  additionalServicesCost: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  subtotal: number;
  depositRequired: number;
  amountPaid: number;
  reorderedFromId: string | null;
  duplicatedFromId: string | null;
  updatedAt: string;
  customer: OrderCustomerOption;
  items: OrderItemData[];
  timeline: OrderTimelineEntryData[];
  productionStages: OrderProductionStageData[];
  notes: OrderNoteData[];
  files: OrderFileData[];
  fittingSessions: FittingSessionData[];
  alterations: AlterationData[];
  activities: OrderActivityData[];
  cancellation: { reason: string; cancelledAt: string; cancelledBy: { name: string | null } | null } | null;
  isDelayed: boolean;
  delayReason: string | null;
  delayedAt: string | null;
  delivery: DeliveryData | null;
  productionUpdates: ProductionUpdateData[];
  qualityControlChecklists: QualityControlChecklistData[];
  disputes: DisputeData[];
  payout: PayoutData | null;
}

export interface DeliveryEventData {
  id: string;
  type: string;
  status: string;
  description: string | null;
  location: string | null;
  occurredAt: string;
}

export interface DeliveryData {
  id: string;
  provider: string;
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  customerContactName: string | null;
  customerContactPhone: string | null;
  packageDescription: string | null;
  packageWeightKg: number | null;
  packageDimensions: string | null;
  deliveryCost: number | null;
  estimatedDeliveryDate: string | null;
  courierName: string | null;
  courierPhone: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  confirmationDeadline: string | null;
  customerConfirmedAt: string | null;
  reportedProblemAt: string | null;
  waybillUrl: string | null;
  packagePhotoUrl: string | null;
  packageVideoUrl: string | null;
  shipmentVerifiedAt: string | null;
  events: DeliveryEventData[];
}

export interface ProductionUpdateData {
  id: string;
  title: string;
  body: string;
  photos: string[];
  createdAt: string;
}

export interface QualityControlItemData {
  id: string;
  label: string;
  passed: boolean;
  notes: string | null;
}

export interface QualityControlChecklistData {
  id: string;
  attemptNumber: number;
  result: string;
  confirmed: boolean;
  notes: string | null;
  photos: string[];
  completedAt: string | null;
  items: QualityControlItemData[];
  failure: { issue: string; correctionRequired: string; expectedCorrectionDate: string | null } | null;
}

export interface DisputeData {
  id: string;
  issueType: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface PayoutData {
  id: string;
  orderAmount: number;
  platformFee: number;
  deliveryFee: number;
  otherDeductions: number;
  refundedAmount: number;
  netAmount: number;
  status: string;
  eligibleAt: string;
  paidAt: string | null;
}

export interface OrderDashboardStats {
  total: number;
  newOrders: number;
  active: number;
  inProduction: number;
  awaitingFitting: number;
  completed: number;
  readyForPickup: number;
  overdue: number;
  cancelled: number;
}
