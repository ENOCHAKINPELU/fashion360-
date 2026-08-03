import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { nextServiceRequestCode } from "@/lib/service-request-code";
import { logCustomerBehavior } from "@/lib/customer-behavior";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 15: "if a customer has not reordered for a configurable period."
export const REORDER_ELIGIBLE_DAYS = 90;

// A plain helper (not a component) so Date.now() here never trips the
// react-compiler purity rule that applies to page/component render bodies
// — same pattern as isReviewEditable in Phase 8.
export function isWardrobeItemReadyForReorder(createdAt: Date): boolean {
  const cutoff = new Date(Date.now() - REORDER_ELIGIBLE_DAYS * 24 * 60 * 60 * 1000);
  return createdAt <= cutoff;
}

// Part 15: a customer-initiated reorder can't responsibly skip straight to
// a new Order (that would bypass the quotation/consultation pipeline every
// other order goes through) — it creates a new ServiceRequest to the same
// business, pre-filled with what's changing, reusing the exact intake flow
// Phase 3 already built rather than inventing a second order-creation path.
export async function createReorderRequest(
  db: Db,
  params: {
    customerProfileId: string;
    wardrobeItemId: string;
    changeColor?: string;
    changeFabric?: string;
    requestMeasurementUpdate?: boolean;
    note?: string;
  }
) {
  const item = await db.customerWardrobeItem.findUniqueOrThrow({ where: { id: params.wardrobeItemId } });
  if (item.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Wardrobe item not found");
  if (!item.businessId) throw new ApiError(400, "This item isn't linked to a business we can reorder from");

  const descriptionParts = [`Reorder request for "${item.garmentName}".`];
  if (params.changeColor) descriptionParts.push(`Requested color: ${params.changeColor}.`);
  if (params.changeFabric) descriptionParts.push(`Requested fabric: ${params.changeFabric}.`);
  if (params.requestMeasurementUpdate) descriptionParts.push("Customer would like to update their measurements first.");
  if (params.note) descriptionParts.push(params.note);

  const requestCode = await nextServiceRequestCode(db, item.businessId);
  const request = await db.serviceRequest.create({
    data: {
      businessId: item.businessId,
      customerProfileId: params.customerProfileId,
      requestCode,
      description: descriptionParts.join(" "),
      status: "SUBMITTED",
    },
  });

  await logCustomerBehavior(db, { customerProfileId: params.customerProfileId, businessId: item.businessId, type: "DESIGN_REORDERED", targetType: "WARDROBE_ITEM", targetId: item.id });
  await notifyBusinessOwners(db, { businessId: item.businessId, title: "Reorder request received", body: `A customer wants to reorder "${item.garmentName}".`, type: "info" });

  return request;
}

// Part 13: "Request Similar Design" — same intake mechanism, anchored to a
// design in the marketplace catalog rather than a wardrobe item.
export async function createSimilarDesignRequest(db: Db, params: { customerProfileId: string; designId: string; note?: string }) {
  const design = await db.design.findUniqueOrThrow({ where: { id: params.designId } });

  const requestCode = await nextServiceRequestCode(db, design.businessId);
  const request = await db.serviceRequest.create({
    data: {
      businessId: design.businessId,
      customerProfileId: params.customerProfileId,
      requestCode,
      description: `Interested in a design similar to "${design.name}".${params.note ? ` ${params.note}` : ""}`,
      status: "SUBMITTED",
    },
  });

  await logCustomerBehavior(db, { customerProfileId: params.customerProfileId, businessId: design.businessId, type: "SIMILAR_DESIGN_REQUESTED", targetType: "DESIGN", targetId: design.id });
  await notifyBusinessOwners(db, { businessId: design.businessId, title: "New design request", body: `A customer wants something similar to "${design.name}".`, type: "info" });

  return request;
}
