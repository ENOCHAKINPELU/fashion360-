import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiErrorResponse, ApiError, requireBusinessContext, requireCustomerContext } from "@/lib/rbac";
import { businessCustomerRelationshipActionSchema } from "@/lib/validations/customer-account";
import { logAuditEvent } from "@/lib/audit-log";

// A PENDING request can be initiated by either side (business invites a
// customer by email, or a customer requests to connect with a business —
// Part 16), so "accept"/"decline" are available to whichever side is
// signed in, as long as they're actually a party to this relationship.
// "block" (business ending things harshly) and "revoke" (customer leaving)
// stay one-directional, matching Part 17's access grant/revoke lifecycle.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, "Not authenticated");

    const { id } = await params;
    const { action } = businessCustomerRelationshipActionSchema.parse(await req.json());

    const relationship = await prisma.businessCustomerRelationship.findUnique({ where: { id } });
    if (!relationship) throw new ApiError(404, "Relationship not found");

    if (action === "block") {
      const { businessId } = await requireBusinessContext();
      if (relationship.businessId !== businessId) throw new ApiError(403, "Not authorized");

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.businessCustomerRelationship.update({
          where: { id },
          data: { status: "BLOCKED", respondedAt: relationship.respondedAt ?? new Date() },
        });
        await logAuditEvent(tx, {
          action: "CUSTOMER_ACCESS_REVOKED",
          userId: session.user.id,
          businessId,
          entityType: "BusinessCustomerRelationship",
          entityId: id,
        });
        return result;
      });
      return NextResponse.json({ relationship: updated });
    }

    if (action === "revoke") {
      const { profile } = await requireCustomerContext();
      if (relationship.customerProfileId !== profile.id) throw new ApiError(403, "Not authorized");

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.businessCustomerRelationship.update({
          where: { id },
          data: { status: "INACTIVE", revokedAt: new Date() },
        });
        await logAuditEvent(tx, {
          action: "CUSTOMER_ACCESS_REVOKED",
          userId: session.user.id,
          businessId: relationship.businessId,
          entityType: "BusinessCustomerRelationship",
          entityId: id,
        });
        return result;
      });
      return NextResponse.json({ relationship: updated });
    }

    // accept | decline — only the side that DIDN'T initiate the request can
    // respond to it (a customer can't accept their own outgoing request,
    // and a business can't accept its own invite).
    let businessId: string | null = null;
    if (session.user.role === "CUSTOMER") {
      const { profile } = await requireCustomerContext();
      if (relationship.customerProfileId !== profile.id) throw new ApiError(403, "Not authorized");
      if (relationship.initiatedBy === "CUSTOMER") throw new ApiError(400, "Waiting for the business to respond to your request");
      businessId = relationship.businessId;
    } else {
      const ctx = await requireBusinessContext();
      if (relationship.businessId !== ctx.businessId) throw new ApiError(403, "Not authorized");
      if (relationship.initiatedBy === "BUSINESS") throw new ApiError(400, "Waiting for the customer to respond to your invite");
      businessId = ctx.businessId;
    }
    if (relationship.status !== "PENDING") throw new ApiError(400, "This request has already been responded to");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.businessCustomerRelationship.update({
        where: { id },
        data: { status: action === "accept" ? "ACTIVE" : "DECLINED", respondedAt: new Date() },
      });
      await logAuditEvent(tx, {
        action: action === "accept" ? "BUSINESS_RELATIONSHIP_ACCEPTED" : "BUSINESS_RELATIONSHIP_DECLINED",
        userId: session.user.id,
        businessId,
        entityType: "BusinessCustomerRelationship",
        entityId: id,
      });
      return result;
    });

    return NextResponse.json({ relationship: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
