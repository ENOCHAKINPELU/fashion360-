export interface DesignPreviewCustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  customerCode: string;
  phone: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
}

export interface DesignPreviewOrderOption {
  id: string;
  orderCode: string;
  totalValue: number;
  expectedCompletionDate: string | null;
}

export interface DesignVersionCustomizationData {
  fabricId: string | null;
  fabricNameSnapshot: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  sleeveStyle: string | null;
  neckline: string | null;
  collarStyle: string | null;
  cuffStyle: string | null;
  length: string | null;
  buttonStyle: string | null;
  embroidery: string | null;
  pocketStyle: string | null;
  lining: string | null;
  accessories: string[];
  otherCustomizations: string | null;
}

export interface DesignModelData {
  id: string;
  format: string;
  url: string;
  thumbnailUrl: string | null;
  fileSizeBytes: number | null;
}

// The PBR subset of FabricLibraryItem needed to render this texture's fabric
// as a real material — see src/features/design-studio/components/viewer/fabric-material.ts.
export interface DesignTextureFabricData {
  baseColorHex: string | null;
  roughness: number | null;
  metalness: number | null;
  opacity: number | null;
  reflectivity: number | null;
  textureMapUrl: string | null;
  normalMapUrl: string | null;
}

export interface DesignTextureData {
  id: string;
  role: string;
  name: string;
  imageUrl: string;
  colorHex: string | null;
  materialType: string | null;
  description: string | null;
  // Present only when this texture is linked to a catalogued fabric with PBR
  // properties set; the viewer falls back to colorHex/imageUrl-only when null.
  fabricLibraryItem: DesignTextureFabricData | null;
}

export interface DesignAnnotationData {
  id: string;
  versionId: string;
  authorType: string;
  author: { name: string | null } | null;
  x: number;
  y: number;
  body: string;
  isResolved: boolean;
  createdAt: string;
}

export interface DesignVersionData {
  id: string;
  versionNumber: number;
  status: string;
  previewType: string;
  previewImageUrl: string | null;
  changesSummary: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string | null } | null;
  customization: DesignVersionCustomizationData | null;
  model: DesignModelData | null;
  textures: DesignTextureData[];
  annotations: DesignAnnotationData[];
}

export interface DesignRevisionRequestData {
  id: string;
  versionId: string | null;
  body: string;
  referenceImages: string[];
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface DesignCommentData {
  id: string;
  versionId: string | null;
  authorType: string;
  author: { name: string | null } | null;
  body: string;
  imageUrl: string | null;
  isResolved: boolean;
  createdAt: string;
}

export interface DesignApprovalData {
  id: string;
  versionId: string;
  decision: string;
  decidedAt: string;
}

export interface DesignApprovalRecordData {
  id: string;
  approvedVersionId: string;
  customizationSummary: Record<string, unknown>;
  measurementProfileId: string | null;
  pdfUrl: string | null;
  approvedAt: string;
  designerConfirmedBy: { name: string | null } | null;
}

export interface DesignShareData {
  id: string;
  token: string;
  channel: string;
  expiresAt: string | null;
  revokedAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  createdBy: { name: string | null } | null;
}

export interface DesignActivityData {
  id: string;
  type: string;
  title: string;
  description: string | null;
  previousValue: string | null;
  newValue: string | null;
  actorType: string;
  actor: { name: string | null } | null;
  createdAt: string;
}

export interface DesignPreviewListItem {
  id: string;
  previewCode: string;
  name: string;
  status: string;
  previewType: string;
  latestVersionNumber: number;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
  order: DesignPreviewOrderOption;
  customer: DesignPreviewCustomerOption;
}

export interface DesignPreviewDetailData extends DesignPreviewListItem {
  orderItemId: string;
  designId: string | null;
  sentForReviewAt: string | null;
  firstViewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  measurementProfileId: string | null;
  measurementSnapshot: Record<string, number> | null;
  versions: DesignVersionData[];
  revisionRequests: DesignRevisionRequestData[];
  comments: DesignCommentData[];
  approvals: DesignApprovalData[];
  approvalRecord: DesignApprovalRecordData | null;
  shares: DesignShareData[];
  activities: DesignActivityData[];
}

export interface DesignDashboardStats {
  totalPreviews: number;
  pendingApproval: number;
  approved: number;
  awaitingRevision: number;
  rejected: number;
  recentlyUpdated: number;
  activeReviews: number;
}
