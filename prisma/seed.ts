import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type { OrderType, OrderPriority, OrderStatus, OrderPaymentStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { encryptSecret } from "../src/lib/encryption";
import { DEMO_MODEL_URL, DEMO_MODEL_FORMAT } from "../src/lib/design-demo-model";

// Reference photo for the demo fabric assignment below — a generated
// placeholder swatch (see the file itself), not a real photographed fabric.
const DEMO_FABRIC_SWATCH_URL = "/images/fashion360/fabrics/demo-royal-silk-swatch.svg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PREDEFINED_TAGS = [
  "VIP",
  "Bride",
  "Celebrity",
  "Corporate",
  "Returning Customer",
  "New Customer",
  "Referral",
  "Wholesale",
  "Walk-In",
];

const DEFAULT_WORKING_HOURS = Object.fromEntries(
  ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => [
    day,
    { open: "09:00", close: "18:00", closed: day === "sunday" },
  ])
);

const DEFAULT_APPOINTMENT_TYPES = [
  { name: "Consultation", color: "#6C3CF0", defaultDurationMinutes: 45 },
  { name: "Measurement", color: "#2F80ED", defaultDurationMinutes: 30 },
  { name: "Fitting", color: "#F5A623", defaultDurationMinutes: 60 },
  { name: "Pickup", color: "#2BB673", defaultDurationMinutes: 15 },
  { name: "Virtual Consultation", color: "#8E63FF", defaultDurationMinutes: 30 },
];

async function seedCustomers(businessId: string, ownerId: string, seedList: CustomerSeed[]) {
  await Promise.all(
    PREDEFINED_TAGS.map((name) =>
      prisma.customerTag.upsert({
        where: { businessId_name: { businessId, name } },
        update: {},
        create: { businessId, name, isSystem: true },
      })
    )
  );

  const customers = [];

  for (const [index, entry] of seedList.entries()) {
    const customerCode = `CUS-${String(index + 1).padStart(4, "0")}`;

    const existing = await prisma.customer.findUnique({
      where: { businessId_customerCode: { businessId, customerCode } },
    });
    if (existing) {
      customers.push(existing);
      continue;
    }

    const customer = await prisma.customer.create({
      data: {
        businessId,
        customerCode,
        firstName: entry.firstName,
        lastName: entry.lastName,
        email: entry.email,
        phone: entry.phone,
        whatsapp: entry.phone,
        gender: entry.gender,
        status: entry.status,
        isVip: entry.isVip ?? false,
        occupation: entry.occupation,
        city: entry.city,
        state: "Lagos",
        country: "Nigeria",
        referralSource: entry.referralSource,
        preferredCommunication: "WHATSAPP",
        tags: entry.tags ? { connect: entry.tags.map((name) => ({ businessId_name: { businessId, name } })) } : undefined,
      },
    });

    await prisma.customerActivity.create({
      data: {
        customerId: customer.id,
        businessId,
        type: "CUSTOMER_CREATED",
        title: "Customer profile created",
        actorId: ownerId,
      },
    });

    if (entry.note) {
      await prisma.customerNote.create({
        data: { customerId: customer.id, body: entry.note, authorId: ownerId },
      });
      await prisma.customerActivity.create({
        data: { customerId: customer.id, businessId, type: "NOTE_ADDED", title: "Note added", actorId: ownerId },
      });
    }

    if (entry.preferences) {
      await prisma.customerPreference.create({
        data: { customerId: customer.id, ...entry.preferences },
      });
    }

    customers.push(customer);
  }

  return customers;
}

async function seedAppointments(
  businessId: string,
  ownerId: string,
  customers: { id: string; firstName: string; lastName: string }[]
) {
  await Promise.all(
    DEFAULT_APPOINTMENT_TYPES.map((type) =>
      prisma.appointmentType.upsert({
        where: { businessId_name: { businessId, name: type.name } },
        update: {},
        create: { businessId, ...type, isSystem: true },
      })
    )
  );
  const types = await prisma.appointmentType.findMany({ where: { businessId } });
  const typeByName = (name: string) => types.find((t) => t.name === name)!;

  await prisma.businessAvailability.upsert({
    where: { businessId },
    update: {},
    create: { businessId, breakStart: "13:00", breakEnd: "14:00", bufferMinutes: 15, maxDailyAppointments: 8 },
  });

  if (customers.length === 0) return;

  const now = new Date();
  function at(daysFromNow: number, hour: number, minute = 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const plan = [
    { customer: customers[0], type: "Consultation", start: at(-7, 11), duration: 45, status: "COMPLETED" as const },
    { customer: customers[0], type: "Fitting", start: at(0, 15), duration: 60, status: "SCHEDULED" as const },
    { customer: customers[1 % customers.length], type: "Measurement", start: at(0, 10), duration: 30, status: "CONFIRMED" as const },
    { customer: customers[2 % customers.length], type: "Consultation", start: at(2, 12), duration: 45, status: "SCHEDULED" as const },
    { customer: customers[3 % customers.length], type: "Pickup", start: at(5, 16), duration: 15, status: "PENDING_CONFIRMATION" as const },
    { customer: customers[1 % customers.length], type: "Fitting", start: at(-3, 14), duration: 60, status: "CANCELLED" as const },
  ];

  for (const item of plan) {
    if (!item.customer) continue;
    const type = typeByName(item.type);
    const endTime = new Date(item.start.getTime() + item.duration * 60_000);

    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        customerId: item.customer.id,
        typeId: type.id,
        status: item.status,
        startTime: item.start,
        endTime,
        location: "In-studio",
        assignedStaffId: ownerId,
        reminderPreferences: { channels: ["EMAIL"], offsetsMinutes: [1440, 120] },
        ...(item.status === "COMPLETED" ? { completedAt: endTime } : {}),
        ...(item.status === "CANCELLED" ? { cancelReason: "Customer requested a different date" } : {}),
      },
    });

    await prisma.appointmentHistory.create({
      data: { appointmentId: appointment.id, businessId, action: "CREATED", actorId: ownerId },
    });
    if (item.status === "COMPLETED") {
      await prisma.appointmentHistory.create({
        data: { appointmentId: appointment.id, businessId, action: "COMPLETED", actorId: ownerId },
      });
    }
    if (item.status === "CANCELLED") {
      await prisma.appointmentHistory.create({
        data: { appointmentId: appointment.id, businessId, action: "CANCELLED", description: appointment.cancelReason ?? undefined, actorId: ownerId },
      });
    }
  }
}

const DESIGN_CATEGORIES = ["Men", "Women", "Bridal", "Traditional", "Corporate"];

const FABRICS = [
  { name: "Premium Silk", texture: "Smooth, lustrous", colorVariants: ["Burgundy", "Gold", "Emerald"] },
  { name: "Ankara Wax Print", texture: "Crisp, structured", colorVariants: ["Multicolor", "Blue", "Orange"] },
  { name: "Italian Wool", texture: "Soft, breathable", colorVariants: ["Charcoal", "Navy", "Grey"] },
];

const COLORS = [
  { name: "Burgundy", hexValue: "#7B1E3A" },
  { name: "Gold", hexValue: "#D4AF37" },
  { name: "Charcoal", hexValue: "#36454F" },
];

const DESIGNS = [
  { name: "Classic Agbada", category: "Men", basePrice: 145000, days: 14, description: "Traditional flowing agbada with hand embroidery." },
  { name: "Modern Senator Wear", category: "Men", basePrice: 65000, days: 7, description: "Contemporary senator suit for corporate and social events." },
  { name: "Bridal Ball Gown", category: "Bridal", basePrice: 320000, days: 21, description: "Layered tulle ball gown with beaded bodice." },
  { name: "Ankara Wrap Dress", category: "Women", basePrice: 48000, days: 5, description: "Fitted wrap dress in vibrant Ankara print." },
  { name: "Executive Two-Piece Suit", category: "Corporate", basePrice: 110000, days: 10, description: "Tailored two-piece suit for the modern executive." },
];

async function seedDesignCatalog(businessId: string, ownerId: string) {
  await Promise.all(
    DESIGN_CATEGORIES.map((name) =>
      prisma.designCategory.upsert({
        where: { businessId_name: { businessId, name } },
        update: {},
        create: { businessId, name, isSystem: true },
      })
    )
  );
  const categories = await prisma.designCategory.findMany({ where: { businessId } });
  const categoryByName = (name: string) => categories.find((c) => c.name === name)!;

  await Promise.all(
    FABRICS.map((f) =>
      prisma.fabricLibraryItem.upsert({
        where: { businessId_name: { businessId, name: f.name } },
        update: {},
        create: { businessId, name: f.name, texture: f.texture, colorVariants: f.colorVariants, recommendedUses: [] },
      })
    )
  );
  const fabrics = await prisma.fabricLibraryItem.findMany({ where: { businessId } });

  await Promise.all(
    COLORS.map((c) =>
      prisma.colorLibraryItem.upsert({
        where: { businessId_name: { businessId, name: c.name } },
        update: {},
        create: { businessId, name: c.name, hexValue: c.hexValue, pairsWith: [] },
      })
    )
  );

  const designs = [];
  for (const [index, entry] of DESIGNS.entries()) {
    const designCode = `DES-${String(index + 1).padStart(4, "0")}`;
    const design = await prisma.design.upsert({
      where: { businessId_designCode: { businessId, designCode } },
      update: {},
      create: {
        businessId,
        designCode,
        name: entry.name,
        description: entry.description,
        categoryId: categoryByName(entry.category).id,
        occasion: entry.category === "Bridal" ? "Wedding" : undefined,
        estimatedCompletionDays: entry.days,
        basePrice: entry.basePrice,
        status: "PUBLISHED",
        createdById: ownerId,
      },
    });
    designs.push(design);
  }

  return { designs, fabrics };
}

const MEASUREMENT_VALUES = {
  neck: 38, shoulder: 46, chest_bust: 96, sleeve_length: 62, waist: 82, hip: 100, garment_length: 110,
};

async function seedMeasurementProfile(businessId: string, customerId: string) {
  const existing = await prisma.measurementProfile.findFirst({
    where: { businessId, customerId, name: "Primary Measurements" },
  });
  const profile =
    existing ??
    (await prisma.measurementProfile.create({
      data: { businessId, customerId, name: "Primary Measurements", isDefault: true },
    }));

  if (existing) return { profile, measurement: null };

  const measurement = await prisma.measurement.create({
    data: {
      businessId,
      customerId,
      profileId: profile.id,
      source: "MANUAL",
      status: "APPROVED",
      unit: "METRIC",
      values: MEASUREMENT_VALUES,
      fitPreference: "REGULAR",
    },
  });

  return { profile, measurement };
}

const PRODUCTION_STAGE_NAMES = [
  "Measurement",
  "Pattern / Cutting",
  "Sewing",
  "Finishing",
  "Fitting",
  "Alteration",
  "Final Inspection",
  "Completed",
];

async function seedProductionStageTemplates(businessId: string) {
  await Promise.all(
    PRODUCTION_STAGE_NAMES.map((name, index) =>
      prisma.productionStageTemplate.upsert({
        where: { businessId_name: { businessId, name } },
        update: {},
        create: { businessId, name, sortOrder: index, isSystem: true },
      })
    )
  );
  return prisma.productionStageTemplate.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } });
}

const TIMELINE_STAGES = [
  "ORDER_CREATED", "CONSULTATION", "MEASUREMENTS_CONFIRMED", "DESIGN_SELECTED", "DESIGN_CUSTOMIZED",
  "DESIGN_APPROVED", "QUOTATION_CREATED", "DEPOSIT_PAID", "PRODUCTION_STARTED", "CUTTING", "SEWING",
  "FINISHING", "FITTING_SCHEDULED", "FITTING_COMPLETED", "ALTERATION_REQUIRED", "FINAL_INSPECTION",
  "COMPLETED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
] as const;

const TIMELINE_CUTOFF: Record<string, number> = {
  DRAFT: 0, PENDING_CONFIRMATION: 0, CONFIRMED: 5, AWAITING_PAYMENT: 6, READY_FOR_PRODUCTION: 8,
  IN_PRODUCTION: 10, FITTING: 12, ALTERATION: 14, FINAL_INSPECTION: 15, COMPLETED: 16,
  READY_FOR_PICKUP: 17, OUT_FOR_DELIVERY: 18, DELIVERED: 19, CANCELLED: 0, ON_HOLD: 8,
};

const PRODUCTION_CUTOFF: Record<string, number> = {
  DRAFT: 0, PENDING_CONFIRMATION: 0, CONFIRMED: 0, AWAITING_PAYMENT: 0, READY_FOR_PRODUCTION: 1,
  IN_PRODUCTION: 2, FITTING: 4, ALTERATION: 5, FINAL_INSPECTION: 6, COMPLETED: 8,
  READY_FOR_PICKUP: 8, OUT_FOR_DELIVERY: 8, DELIVERED: 8, CANCELLED: 0, ON_HOLD: 2,
};

async function seedOrderWorkflow(orderId: string, businessId: string, status: string, createdAt: Date, templates: { id: string; name: string }[]) {
  const timelineCutoff = TIMELINE_CUTOFF[status] ?? 0;
  await prisma.orderTimelineEntry.createMany({
    data: TIMELINE_STAGES.map((stage, index) => ({
      orderId,
      businessId,
      stage,
      sortOrder: index,
      isApplicable:
        stage === "CANCELLED" ? status === "CANCELLED" : stage === "ALTERATION_REQUIRED" ? status === "ALTERATION" : true,
      status: index === 0 ? "COMPLETED" : index < timelineCutoff ? "COMPLETED" : index === timelineCutoff ? "IN_PROGRESS" : "NOT_STARTED",
      occurredAt: index <= timelineCutoff ? createdAt : null,
    })),
  });

  const productionCutoff = PRODUCTION_CUTOFF[status] ?? 0;
  await prisma.orderProductionStage.createMany({
    data: templates.map((template, index) => ({
      orderId,
      businessId,
      templateId: template.id,
      name: template.name,
      sortOrder: index,
      status: index < productionCutoff ? "COMPLETED" : index === productionCutoff ? "IN_PROGRESS" : "NOT_STARTED",
      startDate: index <= productionCutoff ? createdAt : null,
      completionDate: index < productionCutoff ? createdAt : null,
    })),
  });
}

async function seedOrders(
  businessId: string,
  ownerId: string,
  customers: { id: string; firstName: string; lastName: string }[],
  designs: { id: string; name: string; basePrice: number | null; categoryId: string | null }[],
  categories: { id: string; name: string }[],
  profiles: Map<string, { id: string; values: Record<string, number> }>
) {
  if (customers.length === 0 || designs.length === 0) return [];
  const templates = await seedProductionStageTemplates(businessId);
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null;
  const createdOrders: { orderId: string; orderItemId: string; customerId: string; status: string; createdAt: Date }[] = [];

  const now = new Date();
  function daysAgo(n: number) {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  }

  const plan: {
    customer: (typeof customers)[number];
    design: (typeof designs)[number];
    orderType: OrderType;
    priority: OrderPriority;
    status: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    createdDaysAgo: number;
    expectedDays: number;
    amountPaidRatio: number;
    withFitting?: boolean;
    withAlteration?: boolean;
    cancelled?: boolean;
  }[] = [
    { customer: customers[0], design: designs[0], orderType: "BESPOKE", priority: "NORMAL", status: "DRAFT", paymentStatus: "PENDING", createdDaysAgo: 1, expectedDays: 14, amountPaidRatio: 0 },
    { customer: customers[0], design: designs[1], orderType: "BESPOKE", priority: "HIGH", status: "CONFIRMED", paymentStatus: "PARTIALLY_PAID", createdDaysAgo: 4, expectedDays: 7, amountPaidRatio: 0.5 },
    { customer: customers[1 % customers.length], design: designs[2], orderType: "BESPOKE", priority: "URGENT", status: "IN_PRODUCTION", paymentStatus: "PARTIALLY_PAID", createdDaysAgo: 10, expectedDays: 21, amountPaidRatio: 0.5, withFitting: true },
    { customer: customers[2 % customers.length], design: designs[3], orderType: "BESPOKE", priority: "NORMAL", status: "FITTING", paymentStatus: "PARTIALLY_PAID", createdDaysAgo: 6, expectedDays: 5, amountPaidRatio: 0.6, withFitting: true, withAlteration: true },
    { customer: customers[3 % customers.length], design: designs[4], orderType: "BESPOKE", priority: "NORMAL", status: "COMPLETED", paymentStatus: "PAID", createdDaysAgo: 20, expectedDays: 10, amountPaidRatio: 1 },
    { customer: customers[1 % customers.length], design: designs[1], orderType: "BESPOKE", priority: "NORMAL", status: "CANCELLED", paymentStatus: "REFUNDED", createdDaysAgo: 15, expectedDays: 7, amountPaidRatio: 0, cancelled: true },
  ];

  for (const [index, item] of plan.entries()) {
    if (!item.customer) continue;

    const orderCode = `ORD-${String(index + 1).padStart(4, "0")}`;
    const existing = await prisma.order.findUnique({
      where: { businessId_orderCode: { businessId, orderCode } },
      include: { items: true },
    });
    if (existing) {
      if (existing.items[0]) {
        createdOrders.push({
          orderId: existing.id,
          orderItemId: existing.items[0].id,
          customerId: existing.customerId,
          status: existing.status,
          createdAt: existing.createdAt,
        });
      }
      continue;
    }

    const createdAt = daysAgo(item.createdDaysAgo);
    const expectedCompletionDate = new Date(createdAt);
    expectedCompletionDate.setDate(expectedCompletionDate.getDate() + item.expectedDays);

    const basePrice = item.design.basePrice ?? 50000;
    const fabricCost = Math.round(basePrice * 0.15);
    const customizationCost = Math.round(basePrice * 0.05);
    const deliveryFee = 3000;
    const subtotal = basePrice + fabricCost + customizationCost;
    const totalValue = subtotal + deliveryFee;
    const depositRequired = Math.round(totalValue * 0.5);
    const amountPaid = Math.round(totalValue * item.amountPaidRatio);
    const balanceDue = Math.max(0, totalValue - amountPaid);

    const profile = profiles.get(item.customer.id);

    const order = await prisma.order.create({
      data: {
        businessId,
        orderCode,
        customerId: item.customer.id,
        measurementProfileId: profile?.id,
        measurementSnapshot: profile?.values,
        orderType: item.orderType,
        priority: item.priority,
        status: item.status,
        paymentStatus: item.paymentStatus,
        orderDate: createdAt,
        expectedCompletionDate,
        deliveryMethod: "PICKUP",
        fabricCost,
        customizationCost,
        additionalServicesCost: 0,
        deliveryFee,
        discount: 0,
        tax: 0,
        subtotal,
        totalValue,
        depositRequired,
        amountPaid,
        balanceDue,
        currentStage: item.status.replace(/_/g, " "),
        createdById: ownerId,
        createdAt,
        items: {
          create: [
            {
              businessId,
              designId: item.design.id,
              designNameSnapshot: item.design.name,
              designCategorySnapshot: categoryName(item.design.categoryId),
              basePrice,
              fabricCost,
              customizationCost,
              additionalServicesCost: 0,
              subtotal: basePrice + fabricCost + customizationCost,
              customization: {
                create: {
                  primaryColor: COLORS[index % COLORS.length].name,
                  accessories: [],
                  referenceImages: [],
                },
              },
            },
          ],
        },
      },
      include: { items: true },
    });

    createdOrders.push({
      orderId: order.id,
      orderItemId: order.items[0].id,
      customerId: item.customer.id,
      status: order.status,
      createdAt,
    });

    await seedOrderWorkflow(order.id, businessId, item.status, createdAt, templates);

    await prisma.orderActivity.create({
      data: { orderId: order.id, businessId, type: "ORDER_CREATED", title: "Order created", actorId: ownerId, createdAt },
    });
    await prisma.customerActivity.create({
      data: { customerId: item.customer.id, businessId, type: "ORDER_CREATED", title: `Order ${orderCode} created`, actorId: ownerId, createdAt },
    });

    if (item.withFitting) {
      const fittingDate = new Date(createdAt);
      fittingDate.setDate(fittingDate.getDate() + Math.round(item.expectedDays / 2));
      const fitting = await prisma.fittingSession.create({
        data: {
          orderId: order.id,
          businessId,
          fittingDate,
          status: item.withAlteration ? "ADJUSTMENT_REQUIRED" : "SCHEDULED",
          fitIssues: item.withAlteration ? "Waist slightly loose, sleeves need shortening." : undefined,
          createdById: ownerId,
        },
      });
      await prisma.orderActivity.create({
        data: { orderId: order.id, businessId, type: "FITTING_SCHEDULED", title: "Fitting session scheduled", actorId: ownerId },
      });

      if (item.withAlteration) {
        await prisma.alteration.create({
          data: {
            orderId: order.id,
            businessId,
            fittingSessionId: fitting.id,
            issue: "Waist is loose and sleeves are too long",
            requiredChange: "Take in waist by 2cm, shorten sleeves by 1.5cm",
            status: "IN_PROGRESS",
            cycleNumber: 1,
            createdById: ownerId,
          },
        });
        await prisma.orderActivity.create({
          data: { orderId: order.id, businessId, type: "ALTERATION_ADDED", title: "Alteration requested (cycle 1)", actorId: ownerId },
        });
      }
    }

    if (item.cancelled) {
      await prisma.orderCancellation.create({
        data: {
          orderId: order.id,
          businessId,
          reason: "Customer changed their mind about the design.",
          cancelledById: ownerId,
          refundEligible: true,
        },
      });
      await prisma.orderActivity.create({
        data: { orderId: order.id, businessId, type: "ORDER_CANCELLED", title: "Order cancelled", actorId: ownerId },
      });
    }
  }

  return createdOrders;
}

const DESIGN_PREVIEW_PLAN: {
  orderIndex: number;
  status: "DRAFT" | "SENT_FOR_REVIEW" | "REVISION_REQUESTED" | "LOCKED";
  designName: string;
  // Attaches the placeholder demo GLB (see src/lib/design-demo-model.ts) so
  // this one seeded preview actually exercises the 3D viewer instead of
  // falling back to the 2D preview image, without claiming to be any
  // customer's real design — the viewer badges it "Demo Model". Left on the
  // still-awaiting-review entry so the full approve/request-changes flow can
  // be demoed against a real interactive 3D model.
  has3DDemo?: boolean;
}[] = [
  { orderIndex: 0, status: "DRAFT", designName: "Classic Agbada Preview" },
  { orderIndex: 1, status: "SENT_FOR_REVIEW", designName: "Modern Senator Wear Preview", has3DDemo: true },
  { orderIndex: 2, status: "LOCKED", designName: "Bridal Ball Gown Preview" },
  { orderIndex: 3, status: "REVISION_REQUESTED", designName: "Ankara Wrap Dress Preview" },
  { orderIndex: 4, status: "LOCKED", designName: "Executive Two-Piece Suit Preview" },
];

async function seedDesignPreviews(
  businessId: string,
  ownerId: string,
  orders: { orderId: string; orderItemId: string; customerId: string; status: string; createdAt: Date }[]
) {
  for (const [planIndex, plan] of DESIGN_PREVIEW_PLAN.entries()) {
    const order = orders[plan.orderIndex];
    if (!order) continue;

    const existing = await prisma.designPreview.findFirst({ where: { orderItemId: order.orderItemId } });
    if (existing) continue;

    const previewCode = `DSN-${String(planIndex + 1).padStart(4, "0")}`;
    const createdAt = order.createdAt;

    // Real PBR fabric so the demo model renders an actual digital material
    // (color/roughness/metalness/reflectivity) rather than just its baked
    // GLB color — the point of the fabric-material engine.
    const demoFabric = plan.has3DDemo
      ? await prisma.fabricLibraryItem.upsert({
          where: { businessId_name: { businessId, name: "Royal Silk" } },
          update: {},
          create: {
            businessId,
            name: "Royal Silk",
            imageUrl: DEMO_FABRIC_SWATCH_URL,
            colorVariants: ["Royal Purple", "Wine", "Deep Blue"],
            texture: "Smooth, fluid drape with a soft sheen",
            recommendedUses: ["Gowns", "Evening Wear"],
            availability: "IN_STOCK",
            baseColorHex: "#3D1F5C",
            roughness: 0.25,
            metalness: 0.02,
            opacity: 1,
            reflectivity: 0.6,
          },
        })
      : null;

    const customizationData = {
      primaryColor: COLORS[planIndex % COLORS.length].name,
      secondaryColor: COLORS[(planIndex + 1) % COLORS.length].name,
      pattern: "Solid",
      sleeveStyle: "Long sleeve",
      neckline: "Round neck",
      collarStyle: "Mandarin collar",
      cuffStyle: "Button cuff",
      length: "Knee length",
      buttonStyle: "Horn buttons",
      embroidery: "Gold thread trim",
      pocketStyle: "Welt pockets",
      lining: "Silk lining",
      accessories: ["Matching cap"],
    };

    const preview = await prisma.designPreview.create({
      data: {
        businessId,
        orderId: order.orderId,
        orderItemId: order.orderItemId,
        customerId: order.customerId,
        previewCode,
        name: plan.designName,
        previewType: plan.has3DDemo ? "THREE_D" : "TWO_D",
        latestVersionNumber: 1,
        status: "DRAFT",
        createdById: ownerId,
        createdAt,
      },
    });

    await prisma.designVersion.create({
      data: {
        previewId: preview.id,
        businessId,
        versionNumber: 1,
        status: "DRAFT",
        previewType: plan.has3DDemo ? "THREE_D" : "TWO_D",
        changesSummary: "Initial design preview",
        createdById: ownerId,
        createdAt,
        customization: { create: customizationData },
        ...(plan.has3DDemo && {
          model: {
            create: {
              businessId,
              format: DEMO_MODEL_FORMAT,
              url: DEMO_MODEL_URL,
              fileSizeBytes: 152068,
              uploadedById: ownerId,
            },
          },
          textures: {
            create: [
              {
                businessId,
                role: "PRIMARY",
                name: demoFabric!.name,
                imageUrl: DEMO_FABRIC_SWATCH_URL,
                colorHex: demoFabric!.baseColorHex,
                materialType: "Silk",
                fabricLibraryItemId: demoFabric!.id,
              },
            ],
          },
        }),
      },
    });

    await prisma.designActivity.create({
      data: { previewId: preview.id, businessId, type: "CREATED", title: "Design preview created", actorId: ownerId, createdAt },
    });
    await prisma.designActivity.create({
      data: { previewId: preview.id, businessId, type: "VERSION_CREATED", title: "Version 1 created", actorId: ownerId, createdAt },
    });

    if (plan.status === "DRAFT") continue;

    // Send version 1 for review.
    const sentAt = new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    await prisma.designVersion.update({ where: { previewId_versionNumber: { previewId: preview.id, versionNumber: 1 } }, data: { status: "ACTIVE" } });
    await prisma.designPreview.update({ where: { id: preview.id }, data: { status: "SENT_FOR_REVIEW", sentForReviewAt: sentAt } });
    await prisma.designActivity.create({
      data: { previewId: preview.id, businessId, type: "SENT_FOR_REVIEW", title: "Version 1 sent for customer review", actorId: ownerId, createdAt: sentAt },
    });

    const share = await prisma.designShare.create({
      data: {
        previewId: preview.id,
        businessId,
        token: generateSeedToken(`${businessId}-${previewCode}`),
        channel: "LINK",
        expiresAt: new Date(sentAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        createdById: ownerId,
        accessCount: 1,
        lastAccessedAt: sentAt,
      },
    });
    await prisma.designActivity.create({
      data: { previewId: preview.id, businessId, type: "SHARE_CREATED", title: "Share link created (link)", actorId: ownerId, createdAt: sentAt },
    });

    const viewedAt = new Date(sentAt.getTime() + 1 * 24 * 60 * 60 * 1000);
    await prisma.designViewSession.create({
      data: { previewId: preview.id, businessId, viewerType: "CUSTOMER", shareId: share.id, startedAt: viewedAt },
    });
    await prisma.designPreview.update({
      where: { id: preview.id },
      data: { firstViewedAt: viewedAt, status: "UNDER_CUSTOMER_REVIEW" },
    });
    await prisma.designActivity.create({
      data: { previewId: preview.id, businessId, type: "CUSTOMER_VIEWED", title: "Customer viewed the design", actorType: "CUSTOMER", createdAt: viewedAt },
    });

    if (plan.status === "SENT_FOR_REVIEW") continue;

    if (plan.status === "REVISION_REQUESTED") {
      const revisedAt = new Date(viewedAt.getTime() + 1 * 24 * 60 * 60 * 1000);
      await prisma.designPreview.update({
        where: { id: preview.id },
        data: { status: "REVISION_REQUESTED", revisionCount: { increment: 1 } },
      });
      await prisma.designRevisionRequest.create({
        data: {
          previewId: preview.id,
          businessId,
          versionId: (await prisma.designVersion.findFirst({ where: { previewId: preview.id } }))!.id,
          body: "Please make the sleeves slightly longer and use a darker shade for the secondary color.",
          createdAt: revisedAt,
        },
      });
      await prisma.designComment.create({
        data: {
          previewId: preview.id,
          businessId,
          authorType: "CUSTOMER",
          body: "Loving the direction so far, just a couple of small tweaks needed!",
          createdAt: revisedAt,
        },
      });
      await prisma.designActivity.create({
        data: {
          previewId: preview.id,
          businessId,
          type: "REVISION_REQUESTED",
          title: "Customer requested a revision",
          actorType: "CUSTOMER",
          createdAt: revisedAt,
        },
      });
      continue;
    }

    if (plan.status === "LOCKED") {
      const approvedAt = new Date(viewedAt.getTime() + 1 * 24 * 60 * 60 * 1000);
      const activeVersion = await prisma.designVersion.findFirstOrThrow({ where: { previewId: preview.id } });

      await prisma.designApproval.create({
        data: {
          previewId: preview.id,
          businessId,
          versionId: activeVersion.id,
          decision: "APPROVED",
          decidedAt: approvedAt,
        },
      });
      await prisma.designVersion.update({ where: { id: activeVersion.id }, data: { status: "APPROVED" } });
      await prisma.designPreview.update({
        where: { id: preview.id },
        data: { status: "LOCKED", approvedAt },
      });
      await prisma.designApprovalRecord.create({
        data: {
          previewId: preview.id,
          businessId,
          approvedVersionId: activeVersion.id,
          customerId: order.customerId,
          customizationSummary: customizationData,
          approvedAt,
        },
      });
      await prisma.designActivity.create({
        data: { previewId: preview.id, businessId, type: "APPROVED", title: "Design approved by customer", actorType: "CUSTOMER", createdAt: approvedAt },
      });
      await prisma.designActivity.create({
        data: { previewId: preview.id, businessId, type: "LOCKED", title: "Version 1 locked for production", actorType: "CUSTOMER", createdAt: approvedAt },
      });
      await prisma.orderActivity.create({
        data: { orderId: order.orderId, businessId, type: "DESIGN_APPROVED", title: `Design "${plan.designName}" approved and locked`, createdAt: approvedAt },
      });
    }
  }
}

// Phase 8: quotations, invoices, payments, receipts, refunds, and a demo
// gateway connection. Reuses the same orders seedOrders() already created
// rather than a separate plan array, since every quotation/invoice must
// belong to a real order.
async function seedFinancials(
  businessId: string,
  ownerId: string,
  orders: { orderId: string; orderItemId: string; customerId: string; status: string; createdAt: Date }[]
) {
  await prisma.businessFinancialSettings.upsert({
    where: { businessId },
    update: {},
    create: { businessId, defaultTaxRate: 7.5, defaultDepositPercentage: 50 },
  });

  await prisma.paymentGatewayConnection.upsert({
    where: { businessId_provider: { businessId, provider: "MOCK" } },
    update: {},
    create: {
      businessId,
      provider: "MOCK",
      publicKey: "pk_demo_mock",
      secretKeyEncrypted: encryptSecret("sk_demo_mock_not_real"),
      currency: "NGN",
      status: "CONNECTED",
      isActive: true,
      connectedById: ownerId,
      connectedAt: new Date(),
      lastTestedAt: new Date(),
      lastTestResult: "Mock provider is always reachable (dev/demo only).",
    },
  });

  const plans: { orderIndex: number; quotationStatus: string; withInvoice: boolean; invoicePayment: "none" | "partial" | "full" | "refunded" }[] = [
    { orderIndex: 0, quotationStatus: "SENT", withInvoice: false, invoicePayment: "none" },
    { orderIndex: 1, quotationStatus: "DECLINED", withInvoice: false, invoicePayment: "none" },
    { orderIndex: 2, quotationStatus: "CONVERTED", withInvoice: true, invoicePayment: "full" },
    { orderIndex: 3, quotationStatus: "CONVERTED", withInvoice: true, invoicePayment: "partial" },
    { orderIndex: 4, quotationStatus: "CONVERTED", withInvoice: true, invoicePayment: "refunded" },
  ];

  for (const [planIndex, plan] of plans.entries()) {
    const order = orders[plan.orderIndex];
    if (!order) continue;

    const existing = await prisma.quotation.findFirst({ where: { orderId: order.orderId } });
    if (existing) continue;

    const orderRow = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId }, select: { totalValue: true, orderCode: true } });
    const itemPrice = Math.max(20000, Math.round(orderRow.totalValue * 0.9));
    const tax = Math.round(itemPrice * 0.075);
    const total = itemPrice + tax;
    const depositRequired = Math.round(total * 0.5);
    const createdAt = order.createdAt;
    const quotationNumber = `QUO-${String(planIndex + 1).padStart(4, "0")}`;

    const quotation = await prisma.quotation.create({
      data: {
        businessId,
        orderId: order.orderId,
        customerId: order.customerId,
        quotationNumber,
        status: "DRAFT",
        latestVersionNumber: 1,
        expiresAt: new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000),
        createdById: ownerId,
        createdAt,
        versions: {
          create: {
            businessId,
            versionNumber: 1,
            status: "DRAFT",
            subtotal: itemPrice,
            tax,
            total,
            depositPercentage: 50,
            depositRequired,
            balanceDue: total - depositRequired,
            paymentTerms: "50% deposit required to begin production, balance due before delivery.",
            cancellationPolicy: "Deposits are non-refundable once fabric has been purchased.",
            createdById: ownerId,
            createdAt,
            items: {
              create: {
                businessId,
                type: "GARMENT",
                name: `${orderRow.orderCode} Custom Garment`,
                quantity: 1,
                unitPrice: itemPrice,
                tax,
                subtotal: itemPrice + tax,
              },
            },
          },
        },
      },
    });

    const version = await prisma.quotationVersion.findFirstOrThrow({ where: { quotationId: quotation.id } });
    const sentAt = new Date(createdAt.getTime() + 1 * 24 * 60 * 60 * 1000);
    await prisma.quotationVersion.update({ where: { id: version.id }, data: { status: "ACTIVE" } });
    await prisma.quotation.update({ where: { id: quotation.id }, data: { status: "SENT", sentAt } });
    await prisma.financialTransaction.create({
      data: { businessId, type: "QUOTATION_SENT", description: `Quotation ${quotationNumber} sent for review`, orderId: order.orderId, customerId: order.customerId, quotationId: quotation.id, actorId: ownerId, createdAt: sentAt },
    });

    if (plan.quotationStatus === "SENT") continue;

    const decidedAt = new Date(sentAt.getTime() + 1 * 24 * 60 * 60 * 1000);
    if (plan.quotationStatus === "DECLINED") {
      await prisma.quotationVersion.update({ where: { id: version.id }, data: { status: "DECLINED" } });
      await prisma.quotation.update({ where: { id: quotation.id }, data: { status: "DECLINED", declinedAt: decidedAt } });
      await prisma.quotationApproval.create({ data: { quotationId: quotation.id, businessId, versionId: version.id, decision: "DECLINED", decidedAt } });
      await prisma.financialTransaction.create({
        data: { businessId, type: "QUOTATION_DECLINED", description: `Quotation ${quotationNumber} declined`, orderId: order.orderId, customerId: order.customerId, quotationId: quotation.id, createdAt: decidedAt },
      });
      continue;
    }

    // ACCEPTED / CONVERTED
    await prisma.quotationVersion.update({ where: { id: version.id }, data: { status: "ACCEPTED" } });
    await prisma.quotation.update({ where: { id: quotation.id }, data: { status: "ACCEPTED", acceptedAt: decidedAt } });
    await prisma.quotationApproval.create({ data: { quotationId: quotation.id, businessId, versionId: version.id, decision: "ACCEPTED", decidedAt } });
    await prisma.financialTransaction.create({
      data: { businessId, type: "QUOTATION_ACCEPTED", description: `Quotation ${quotationNumber} accepted`, orderId: order.orderId, customerId: order.customerId, quotationId: quotation.id, createdAt: decidedAt },
    });

    if (!plan.withInvoice) continue;

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(planIndex + 1).padStart(4, "0")}`;
    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        orderId: order.orderId,
        customerId: order.customerId,
        quotationId: quotation.id,
        invoiceNumber,
        status: "SENT",
        dueDate: new Date(decidedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
        subtotal: itemPrice,
        tax,
        total,
        balanceDue: total,
        paymentTerms: version.paymentTerms,
        sentAt: decidedAt,
        createdById: ownerId,
        createdAt: decidedAt,
        items: {
          create: {
            businessId,
            type: "GARMENT",
            name: `${orderRow.orderCode} Custom Garment`,
            quantity: 1,
            unitPrice: itemPrice,
            tax,
            subtotal: itemPrice + tax,
          },
        },
      },
    });
    await prisma.quotation.update({ where: { id: quotation.id }, data: { status: "CONVERTED" } });
    await prisma.financialTransaction.create({
      data: { businessId, type: "INVOICE_CREATED", description: `Invoice ${invoiceNumber} created from quotation ${quotationNumber}`, orderId: order.orderId, customerId: order.customerId, invoiceId: invoice.id, amount: total, createdAt: decidedAt },
    });

    if (plan.invoicePayment === "none") continue;

    async function recordSeedPayment(amount: number, paidAt: Date, method: "BANK_TRANSFER" | "ONLINE") {
      const payment = await prisma.payment.create({
        data: {
          businessId,
          invoiceId: invoice.id,
          orderId: order.orderId,
          customerId: order.customerId,
          amount,
          currency: "NGN",
          method,
          provider: method === "ONLINE" ? "MOCK" : "MANUAL",
          providerReference: method === "ONLINE" ? `mock_seed_${invoice.id}_${paidAt.getTime()}` : `TRF-${invoice.id.slice(-6)}`,
          idempotencyKey: `seed_${invoice.id}_${paidAt.getTime()}`,
          status: "SUCCESSFUL",
          recordedById: method === "BANK_TRANSFER" ? ownerId : null,
          paidAt,
          createdAt: paidAt,
        },
      });
      const receiptNumber = `RCT-${String((await prisma.receipt.count({ where: { businessId } })) + 1).padStart(4, "0")}`;
      await prisma.receipt.create({ data: { paymentId: payment.id, businessId, receiptNumber, createdAt: paidAt } });
      await prisma.financialTransaction.create({
        data: { businessId, type: "PAYMENT_RECEIVED", description: `Payment of ${amount} NGN received on ${invoiceNumber}`, orderId: order.orderId, customerId: order.customerId, invoiceId: invoice.id, paymentId: payment.id, amount, currency: "NGN", method, createdAt: paidAt },
      });
      return payment;
    }

    const depositPaidAt = new Date(decidedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const depositPayment = await recordSeedPayment(depositRequired, depositPaidAt, "BANK_TRANSFER");
    await prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: depositRequired, balanceDue: total - depositRequired, status: "PARTIALLY_PAID" } });
    await prisma.order.update({ where: { id: order.orderId }, data: { amountPaid: depositRequired, balanceDue: total - depositRequired, paymentStatus: "PARTIALLY_PAID" } });

    if (plan.invoicePayment === "partial") continue;

    if (plan.invoicePayment === "full" || plan.invoicePayment === "refunded") {
      const balancePaidAt = new Date(depositPaidAt.getTime() + 5 * 24 * 60 * 60 * 1000);
      await recordSeedPayment(total - depositRequired, balancePaidAt, "ONLINE");
      await prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: total, balanceDue: 0, status: "PAID" } });
      await prisma.order.update({ where: { id: order.orderId }, data: { amountPaid: total, balanceDue: 0, paymentStatus: "PAID" } });
    }

    if (plan.invoicePayment === "refunded") {
      const refundedAt = new Date(decidedAt.getTime() + 10 * 24 * 60 * 60 * 1000);
      const refund = await prisma.refund.create({
        data: {
          businessId,
          paymentId: depositPayment.id,
          amount: Math.round(depositRequired * 0.2),
          type: "PARTIAL",
          reason: "Customer requested a partial refund after a fabric substitution.",
          status: "SUCCESSFUL",
          processedById: ownerId,
          processedAt: refundedAt,
          createdAt: refundedAt,
        },
      });
      const newAmountPaid = total - refund.amount;
      await prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: newAmountPaid, balanceDue: 0, status: "PARTIALLY_REFUNDED" } });
      await prisma.financialTransaction.create({
        data: { businessId, type: "REFUND_PROCESSED", description: `Refund of ${refund.amount} NGN processed for ${invoiceNumber}`, orderId: order.orderId, customerId: order.customerId, invoiceId: invoice.id, paymentId: depositPayment.id, refundId: refund.id, amount: refund.amount, currency: "NGN", createdAt: refundedAt },
      });
    }
  }
}

function generateSeedToken(seed: string) {
  return Buffer.from(`${seed}-${Math.abs(hashCode(seed))}`).toString("base64url");
}

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

interface CustomerSeed {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  status: "LEAD" | "PROSPECT" | "ACTIVE" | "INACTIVE" | "BLOCKED";
  isVip?: boolean;
  occupation?: string;
  city?: string;
  referralSource?: string;
  tags?: string[];
  note?: string;
  preferences?: {
    fabricPreferences: string[];
    colorPreferences: string[];
    stylePreferences: string[];
    bodyShapeNotes?: string;
    specialInstructions?: string;
  };
}

async function main() {
  const password = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "admin@fashion360.app" },
    update: {},
    create: {
      email: "admin@fashion360.app",
      name: "Fashion360 Admin",
      firstName: "Fashion360",
      lastName: "Admin",
      passwordHash: password,
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  const ada = await prisma.business.upsert({
    where: { slug: "ada-couture" },
    update: {},
    create: {
      name: "Ada Couture",
      slug: "ada-couture",
      email: "hello@adacouture.com",
      phone: "+2348000000001",
      country: "Nigeria",
      state: "Lagos",
      city: "Ikeja",
      address: "12 Allen Avenue",
      businessType: "TAILORING_SHOP",
      currency: "NGN",
      timezone: "Africa/Lagos",
      measurementUnit: "METRIC",
      workingHours: DEFAULT_WORKING_HOURS,
      onboardingCompletedAt: new Date(),
    },
  });

  const adaOwner = await prisma.user.upsert({
    where: { email: "ada@adacouture.com" },
    update: {},
    create: {
      email: "ada@adacouture.com",
      name: "Ada Okafor",
      firstName: "Ada",
      lastName: "Okafor",
      position: "Founder",
      passwordHash: password,
      role: "OWNER",
      businessId: ada.id,
      emailVerified: new Date(),
      notificationPreferences: { email: true, sms: false, whatsapp: false, push: true },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        businessId: ada.id,
        userId: adaOwner.id,
        title: "Welcome to Fashion360",
        body: "Ada Couture is now set up. Explore your dashboard to get started.",
        type: "success",
      },
      {
        businessId: ada.id,
        userId: adaOwner.id,
        title: "Complete your business profile",
        body: "Add your logo and brand colors in Settings to personalize your workspace.",
        type: "info",
      },
    ],
    skipDuplicates: true,
  });

  const adaCustomers = await seedCustomers(ada.id, adaOwner.id, [
    {
      firstName: "Amara",
      lastName: "Chukwu",
      email: "amara.chukwu@example.com",
      phone: "+2348011111001",
      gender: "FEMALE",
      status: "ACTIVE",
      isVip: true,
      occupation: "Marketing Executive",
      city: "Ikeja",
      referralSource: "Instagram",
      tags: ["VIP", "Returning Customer"],
      note: "Prefers appointments after 4pm on weekdays.",
      preferences: {
        fabricPreferences: ["Silk", "Lace"],
        colorPreferences: ["Burgundy", "Gold"],
        stylePreferences: ["Fitted", "Off-shoulder"],
        bodyShapeNotes: "Pear shape, prioritizes waist definition.",
        specialInstructions: "Always double-check sleeve length, prefers 3/4 sleeves.",
      },
    },
    {
      firstName: "Chinedu",
      lastName: "Okafor",
      email: "chinedu.okafor@example.com",
      phone: "+2348011111002",
      gender: "MALE",
      status: "ACTIVE",
      occupation: "Investment Banker",
      city: "Victoria Island",
      referralSource: "Referral",
      tags: ["Corporate", "Returning Customer"],
    },
    {
      firstName: "Fatima",
      lastName: "Bello",
      email: "fatima.bello@example.com",
      phone: "+2348011111003",
      gender: "FEMALE",
      status: "PROSPECT",
      occupation: "Entrepreneur",
      city: "Lekki",
      referralSource: "Walk-in",
      tags: ["Bride", "New Customer"],
      note: "Wedding planned for December, first consultation booked.",
    },
    {
      firstName: "Bola",
      lastName: "Adeyemi",
      email: "bola.adeyemi@example.com",
      phone: "+2348011111004",
      gender: "MALE",
      status: "LEAD",
      occupation: "Software Engineer",
      city: "Yaba",
      referralSource: "Google Search",
      tags: ["New Customer"],
    },
    {
      firstName: "Grace",
      lastName: "Nwosu",
      email: "grace.nwosu@example.com",
      phone: "+2348011111005",
      gender: "FEMALE",
      status: "INACTIVE",
      occupation: "Lawyer",
      city: "Ikoyi",
      referralSource: "Instagram",
      tags: ["Wholesale"],
    },
  ]);

  await seedAppointments(ada.id, adaOwner.id, adaCustomers);

  const adaCatalog = await seedDesignCatalog(ada.id, adaOwner.id);
  const adaCategories = await prisma.designCategory.findMany({ where: { businessId: ada.id } });
  const adaProfiles = new Map<string, { id: string; values: Record<string, number> }>();
  for (const customer of adaCustomers.slice(0, 4)) {
    const { profile, measurement } = await seedMeasurementProfile(ada.id, customer.id);
    adaProfiles.set(customer.id, { id: profile.id, values: (measurement?.values ?? MEASUREMENT_VALUES) as Record<string, number> });
  }
  const adaOrders = await seedOrders(ada.id, adaOwner.id, adaCustomers, adaCatalog.designs, adaCategories, adaProfiles);
  await seedDesignPreviews(ada.id, adaOwner.id, adaOrders);
  await seedFinancials(ada.id, adaOwner.id, adaOrders);

  const house = await prisma.business.upsert({
    where: { slug: "house-of-tunde" },
    update: {},
    create: {
      name: "House of Tunde",
      slug: "house-of-tunde",
      email: "studio@houseoftunde.com",
      phone: "+2348000000002",
      country: "Nigeria",
      state: "Lagos",
      city: "Victoria Island",
      address: "5 Adeola Odeku Street",
      businessType: "FASHION_HOUSE",
      currency: "NGN",
      timezone: "Africa/Lagos",
      measurementUnit: "METRIC",
      workingHours: DEFAULT_WORKING_HOURS,
      onboardingCompletedAt: new Date(),
    },
  });

  const tundeOwner = await prisma.user.upsert({
    where: { email: "tunde@houseoftunde.com" },
    update: {},
    create: {
      email: "tunde@houseoftunde.com",
      name: "Tunde Bakare",
      firstName: "Tunde",
      lastName: "Bakare",
      position: "Creative Director",
      passwordHash: password,
      role: "OWNER",
      businessId: house.id,
      emailVerified: new Date(),
      notificationPreferences: { email: true, sms: false, whatsapp: false, push: true },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        businessId: house.id,
        userId: tundeOwner.id,
        title: "Welcome to Fashion360",
        body: "House of Tunde is now set up. Explore your dashboard to get started.",
        type: "success",
      },
    ],
    skipDuplicates: true,
  });

  const houseCustomers = await seedCustomers(house.id, tundeOwner.id, [
    {
      firstName: "Ngozi",
      lastName: "Eze",
      email: "ngozi.eze@example.com",
      phone: "+2348022222001",
      gender: "FEMALE",
      status: "ACTIVE",
      isVip: true,
      occupation: "Media Personality",
      city: "Victoria Island",
      referralSource: "Referral",
      tags: ["Celebrity", "VIP"],
      note: "High-profile client, coordinate fittings privately.",
    },
    {
      firstName: "Tobi",
      lastName: "Alabi",
      email: "tobi.alabi@example.com",
      phone: "+2348022222002",
      gender: "MALE",
      status: "PROSPECT",
      occupation: "Architect",
      city: "Ikoyi",
      referralSource: "Instagram",
      tags: ["New Customer"],
    },
    {
      firstName: "Chiamaka",
      lastName: "Obi",
      email: "chiamaka.obi@example.com",
      phone: "+2348022222003",
      gender: "FEMALE",
      status: "ACTIVE",
      occupation: "Fashion Blogger",
      city: "Lekki",
      referralSource: "Referral",
      tags: ["Returning Customer"],
      preferences: {
        fabricPreferences: ["Ankara", "Velvet"],
        colorPreferences: ["Emerald Green"],
        stylePreferences: ["A-line"],
      },
    },
    {
      firstName: "Yusuf",
      lastName: "Mohammed",
      email: "yusuf.mohammed@example.com",
      phone: "+2348022222004",
      gender: "MALE",
      status: "LEAD",
      occupation: "Business Owner",
      city: "Victoria Island",
      referralSource: "Google Search",
      tags: ["Wholesale"],
    },
  ]);

  await seedAppointments(house.id, tundeOwner.id, houseCustomers);

  const houseCatalog = await seedDesignCatalog(house.id, tundeOwner.id);
  const houseCategories = await prisma.designCategory.findMany({ where: { businessId: house.id } });
  const houseProfiles = new Map<string, { id: string; values: Record<string, number> }>();
  for (const customer of houseCustomers.slice(0, 4)) {
    const { profile, measurement } = await seedMeasurementProfile(house.id, customer.id);
    houseProfiles.set(customer.id, { id: profile.id, values: (measurement?.values ?? MEASUREMENT_VALUES) as Record<string, number> });
  }
  const houseOrders = await seedOrders(house.id, tundeOwner.id, houseCustomers, houseCatalog.designs, houseCategories, houseProfiles);
  await seedDesignPreviews(house.id, tundeOwner.id, houseOrders);
  await seedFinancials(house.id, tundeOwner.id, houseOrders);

  console.log("Seed complete:");
  console.log("  Super admin: admin@fashion360.app / password123");
  console.log("  Owner (Ada Couture): ada@adacouture.com / password123");
  console.log("  Owner (House of Tunde): tunde@houseoftunde.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
