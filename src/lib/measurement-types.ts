import type { Prisma, MeasurementFieldCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export const DEFAULT_MEASUREMENT_TYPES: {
  key: string;
  label: string;
  category: MeasurementFieldCategory;
}[] = [
  // Upper body
  { key: "neck", label: "Neck", category: "UPPER_BODY" },
  { key: "shoulder", label: "Shoulder", category: "UPPER_BODY" },
  { key: "chest_bust", label: "Chest/Bust", category: "UPPER_BODY" },
  { key: "across_chest", label: "Across Chest", category: "UPPER_BODY" },
  { key: "across_back", label: "Across Back", category: "UPPER_BODY" },
  { key: "sleeve_length", label: "Sleeve Length", category: "UPPER_BODY" },
  { key: "arm_length", label: "Arm Length", category: "UPPER_BODY" },
  { key: "wrist", label: "Wrist", category: "UPPER_BODY" },
  { key: "bicep", label: "Bicep", category: "UPPER_BODY" },
  { key: "elbow", label: "Elbow", category: "UPPER_BODY" },
  { key: "garment_length", label: "Garment Length", category: "UPPER_BODY" },
  // Lower body
  { key: "waist", label: "Waist", category: "LOWER_BODY" },
  { key: "hip", label: "Hip", category: "LOWER_BODY" },
  { key: "thigh", label: "Thigh", category: "LOWER_BODY" },
  { key: "knee", label: "Knee", category: "LOWER_BODY" },
  { key: "calf", label: "Calf", category: "LOWER_BODY" },
  { key: "ankle", label: "Ankle", category: "LOWER_BODY" },
  { key: "inseam", label: "Inseam", category: "LOWER_BODY" },
  { key: "outseam", label: "Outseam", category: "LOWER_BODY" },
  { key: "rise", label: "Rise", category: "LOWER_BODY" },
  // Dress
  { key: "skirt_length", label: "Skirt Length", category: "DRESS" },
  { key: "dress_length", label: "Dress Length", category: "DRESS" },
  { key: "bust_point", label: "Bust Point", category: "DRESS" },
  { key: "waist_to_hip", label: "Waist to Hip", category: "DRESS" },
  { key: "waist_to_floor", label: "Waist to Floor", category: "DRESS" },
  // Additional
  { key: "head", label: "Head", category: "ADDITIONAL" },
  { key: "hand", label: "Hand", category: "ADDITIONAL" },
  { key: "foot", label: "Foot", category: "ADDITIONAL" },
];

export async function ensureDefaultMeasurementTypes(db: Db, businessId: string) {
  await db.measurementType.createMany({
    data: DEFAULT_MEASUREMENT_TYPES.map((type, index) => ({
      businessId,
      ...type,
      sortOrder: index,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}

export function slugifyKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}
