import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logCustomerBehavior } from "@/lib/customer-behavior";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 9 (Phase 2 schema) / Phase 10 repair: the real write-paths that were
// never wired — CustomerFashionHistory/CustomerDesignHistory/
// CustomerWardrobeItem existed as read-only scaffolding with an explicit
// "nothing writes here yet" comment. These three functions are that
// missing wiring, called from the handful of lifecycle points that
// actually mark a fashion milestone (order placed, garment delivered,
// review left) rather than threading through every possible touchpoint.

export async function recordOrderPlaced(db: Db, params: { customerProfileId: string; businessId: string; orderCode: string; designName: string | null; designerName?: string | null }) {
  await db.customerFashionHistory.create({
    data: {
      customerProfileId: params.customerProfileId,
      businessId: params.businessId,
      eventType: "ORDER_PLACED",
      description: params.designName ? `Ordered "${params.designName}"` : `Order ${params.orderCode} placed`,
      orderReference: params.orderCode,
    },
  });
  if (params.designName) {
    await db.customerDesignHistory.create({
      data: {
        customerProfileId: params.customerProfileId,
        businessId: params.businessId,
        designName: params.designName,
        designerName: params.designerName ?? null,
        status: "Ordered",
        orderReference: params.orderCode,
      },
    });
  }
}

// The actual "digital wardrobe" write — called once an order is fully
// complete (payout eligible = delivered + confirmed, the same trustworthy
// completion signal Phase 7 uses, never a client-side-only event).
export async function recordGarmentDelivered(
  db: Db,
  params: {
    customerProfileId: string;
    businessId: string;
    orderCode: string;
    garmentName: string;
    imageUrl?: string | null;
    category?: string | null;
    color?: string | null;
    fabric?: string | null;
  }
) {
  await db.customerFashionHistory.create({
    data: {
      customerProfileId: params.customerProfileId,
      businessId: params.businessId,
      eventType: "GARMENT_DELIVERED",
      description: `"${params.garmentName}" delivered`,
      orderReference: params.orderCode,
    },
  });
  await db.customerWardrobeItem.create({
    data: {
      customerProfileId: params.customerProfileId,
      businessId: params.businessId,
      garmentName: params.garmentName,
      imageUrl: params.imageUrl,
      category: params.category,
      color: params.color,
      fabric: params.fabric,
      orderReference: params.orderCode,
    },
  });
  await logCustomerBehavior(db, {
    customerProfileId: params.customerProfileId,
    businessId: params.businessId,
    type: "WARDROBE_ADDED",
    targetType: "ORDER",
    targetId: params.orderCode,
  });
}

export async function recordReviewLeft(db: Db, params: { customerProfileId: string; businessId: string; orderCode: string }) {
  await db.customerFashionHistory.create({
    data: {
      customerProfileId: params.customerProfileId,
      businessId: params.businessId,
      eventType: "REVIEW_LEFT",
      description: `Left a review for order ${params.orderCode}`,
      orderReference: params.orderCode,
    },
  });
}
