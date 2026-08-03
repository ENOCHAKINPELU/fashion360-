import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export const DEFAULT_MEASUREMENT_TEMPLATES: {
  name: string;
  category: string;
  requiredKeys: string[];
  optionalKeys?: string[];
}[] = [
  {
    name: "Men",
    category: "Men",
    requiredKeys: ["neck", "shoulder", "chest_bust", "sleeve_length", "waist", "hip", "inseam", "garment_length"],
  },
  {
    name: "Women",
    category: "Women",
    requiredKeys: ["shoulder", "chest_bust", "waist", "hip", "sleeve_length", "garment_length"],
    optionalKeys: ["dress_length"],
  },
  {
    name: "Children",
    category: "Children",
    requiredKeys: ["chest_bust", "waist", "hip", "shoulder", "sleeve_length", "garment_length"],
  },
  {
    name: "Traditional Wear",
    category: "Traditional Wear",
    requiredKeys: ["neck", "shoulder", "chest_bust", "sleeve_length", "garment_length", "waist", "hip"],
  },
  {
    name: "Agbada",
    category: "Traditional Wear",
    requiredKeys: ["neck", "shoulder", "chest_bust", "across_chest", "across_back", "sleeve_length", "garment_length"],
  },
  {
    name: "Senator",
    category: "Traditional Wear",
    requiredKeys: ["neck", "shoulder", "chest_bust", "sleeve_length", "waist", "hip", "garment_length"],
  },
  {
    name: "Suit",
    category: "Corporate",
    requiredKeys: [
      "neck",
      "shoulder",
      "chest_bust",
      "across_chest",
      "across_back",
      "sleeve_length",
      "bicep",
      "elbow",
      "wrist",
      "waist",
      "hip",
      "inseam",
      "outseam",
      "garment_length",
    ],
  },
  {
    name: "Wedding Gown",
    category: "Wedding",
    requiredKeys: ["bust_point", "chest_bust", "waist", "hip", "waist_to_hip", "waist_to_floor", "dress_length", "shoulder"],
  },
  {
    name: "Native Wear",
    category: "Traditional Wear",
    requiredKeys: ["neck", "shoulder", "chest_bust", "sleeve_length", "garment_length", "waist", "hip"],
  },
  {
    name: "Kaftan",
    category: "Traditional Wear",
    requiredKeys: ["neck", "shoulder", "chest_bust", "sleeve_length", "garment_length"],
  },
  {
    name: "Corporate",
    category: "Corporate",
    requiredKeys: ["neck", "shoulder", "chest_bust", "waist", "hip", "sleeve_length", "garment_length", "inseam"],
  },
  {
    name: "Casual",
    category: "Casual",
    requiredKeys: ["chest_bust", "waist", "hip", "shoulder", "sleeve_length"],
  },
];

export async function ensureDefaultMeasurementTemplates(db: Db, businessId: string) {
  await db.measurementTemplate.createMany({
    data: DEFAULT_MEASUREMENT_TEMPLATES.map((tpl) => ({
      businessId,
      name: tpl.name,
      category: tpl.category,
      isSystem: true,
    })),
    skipDuplicates: true,
  });

  const types = await db.measurementType.findMany({ where: { businessId } });
  const typeByKey = new Map(types.map((t) => [t.key, t]));
  const templates = await db.measurementTemplate.findMany({ where: { businessId } });
  const templateByName = new Map(templates.map((template) => [template.name, template]));
  const templateFields: Prisma.MeasurementTemplateFieldCreateManyInput[] = [];

  for (const tpl of DEFAULT_MEASUREMENT_TEMPLATES) {
    const template = templateByName.get(tpl.name);
    if (!template) continue;

    const allKeys = [
      ...tpl.requiredKeys.map((key) => ({ key, required: true })),
      ...(tpl.optionalKeys ?? []).map((key) => ({ key, required: false })),
    ];

    templateFields.push(
      ...allKeys.flatMap((entry, index) => {
        const type = typeByKey.get(entry.key);
        if (!type) return [];
        return [
          {
            templateId: template.id,
            measurementTypeId: type.id,
            required: entry.required,
            sortOrder: index,
          },
        ];
      })
    );
  }

  await db.measurementTemplateField.createMany({
    data: templateFields,
    skipDuplicates: true,
  });
}
