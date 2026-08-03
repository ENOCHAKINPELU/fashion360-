import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";

// Part 16: the customer-initiated half of the connection workflow (the
// business-initiated half already existed as POST /api/business-customer-
// relationships). A business only ever needs to see this once it's
// PENDING/ACTIVE — visibility rules (Part 5) are enforced by whichever
// route renders the business's public profile, not here.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, session } = await requireCustomerContext();
    const { id: businessId } = await params;

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new ApiError(404, "Business not found");

    const existing = await prisma.businessCustomerRelationship.findUnique({
      where: { businessId_customerProfileId: { businessId, customerProfileId: profile.id } },
    });

    if (existing) {
      if (existing.status === "ACTIVE" || existing.status === "PENDING") {
        throw new ApiError(409, "You already have a connection with this business");
      }
      // Previously DECLINED/INACTIVE/BLOCKED — a fresh request re-opens it.
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.businessCustomerRelationship.update({
          where: { id: existing.id },
          data: { status: "PENDING", initiatedBy: "CUSTOMER", requestedAt: new Date(), respondedAt: null, revokedAt: null },
        });
        await logAuditEvent(tx, {
          action: "BUSINESS_RELATIONSHIP_REQUESTED",
          userId: session.user.id,
          businessId,
          entityType: "BusinessCustomerRelationship",
          entityId: result.id,
        });
        return result;
      });
      return NextResponse.json({ relationship: updated });
    }

    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.businessCustomerRelationship.create({
        data: { businessId, customerProfileId: profile.id, status: "PENDING", initiatedBy: "CUSTOMER" },
      });
      await logAuditEvent(tx, {
        action: "BUSINESS_RELATIONSHIP_REQUESTED",
        userId: session.user.id,
        businessId,
        entityType: "BusinessCustomerRelationship",
        entityId: result.id,
      });
      return result;
    });

    return NextResponse.json({ relationship: created }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
