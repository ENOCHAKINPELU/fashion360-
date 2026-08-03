export interface MeasurementTypeItem {
  id: string;
  key: string;
  label: string;
  category: "UPPER_BODY" | "LOWER_BODY" | "DRESS" | "ADDITIONAL" | "CUSTOM";
  unit: "METRIC" | "IMPERIAL";
  isSystem: boolean;
}

export interface MeasurementTemplateField {
  id: string;
  required: boolean;
  measurementType: MeasurementTypeItem;
}

export interface MeasurementTemplateItem {
  id: string;
  name: string;
  category: string | null;
  isSystem: boolean;
  fields: MeasurementTemplateField[];
}

export interface MeasurementCustomerRef {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
}

export interface MeasurementProfileItem {
  id: string;
  name: string;
  isDefault: boolean;
  isArchived: boolean;
  customerId: string;
  customer?: MeasurementCustomerRef;
  createdAt: string;
  updatedAt: string;
  _count?: { measurements: number };
  measurements?: MeasurementRecordItem[];
}

export interface MeasurementRecordItem {
  id: string;
  profileId: string;
  customerId: string;
  customer?: MeasurementCustomerRef;
  profile?: { id: string; name: string };
  template?: { id: string; name: string } | null;
  source: "MANUAL" | "AI_ESTIMATED";
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED";
  unit: "METRIC" | "IMPERIAL";
  values: Record<string, number>;
  heightCm?: number | null;
  weightKg?: number | null;
  gender?: string | null;
  frontImageUrl?: string | null;
  sideImageUrl?: string | null;
  fitPreference?: "TIGHT" | "REGULAR" | "LOOSE" | null;
  createdBy?: { name: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementSessionItem {
  id: string;
  customerId: string;
  customer?: MeasurementCustomerRef;
  profileId: string | null;
  profile?: { id: string; name: string } | null;
  templateId: string | null;
  template?: { id: string; name: string } | null;
  method: "MANUAL" | "PHOTO_ESTIMATION";
  status: "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED";
  draftValues: Record<string, number> | null;
  resultMeasurementId: string | null;
  startedBy?: { name: string | null } | null;
  startedAt: string;
  pausedAt: string | null;
  completedAt: string | null;
}
