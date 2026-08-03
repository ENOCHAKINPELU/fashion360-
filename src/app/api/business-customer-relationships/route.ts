import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiErrorResponse, ApiError, requireBusinessContext, requireCustomerContext } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { z } from "zod";

// Lists the caller's own relationships — a business sees its customers, a
// customer sees the businesses they're connected to. Never lets either side
// query someone else's relationships (Part 22 — data access validation).
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, "Not authenticated");

    if (session.user.role === "CUSTOMER") {
      const { profile } = await requireCustomerContext();
      const relationships = await prisma.businessCustomerRelationship.findMany({
        where: { customerProfileId: profile.id },
        orderBy: { createdAt: "desc" },
        include: { business: { select: { id: true, name: true, logoUrl: true, businessType: true, city: true, state: true } } },
      });
      return NextResponse.json({ relationships });
    }

    const { businessId } = await requireBusinessContext();
    const relationships = await prisma.businessCustomerRelationship.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: {
        customerProfile: { include: { user: { select: { name: true, email: true, image: true } } } },
        linkedCustomer: { select: { id: true, customerCode: true } },
      },
    });
    return NextResponse.json({ relationships });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({ customerEmail: z.string().email() });

// Business-initiated: invite a platform customer by email. Starts PENDING —
// unlike the auto-matched links created at customer registration, this is a
// genuinely new request awaiting the customer's acceptance (Part 17).
export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { customerEmail } = createSchema.parse(await req.json());

    const targetUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      include: { customerProfile: true },
    });
    if (!targetUser?.customerProfile) {
      throw new ApiError(404, "No Fashion360 customer account found for this email");
    }

    const existing = await prisma.businessCustomerRelationship.findUnique({
      where: { businessId_customerProfileId: { businessId, customerProfileId: targetUser.customerProfile.id } },
    });
    if (existing) throw new ApiError(409, "A relationship with this customer already exists");

    const relationship = await prisma.$transaction(async (tx) => {
      const created = await tx.businessCustomerRelationship.create({
        data: { businessId, customerProfileId: targetUser.customerProfile!.id, status: "PENDING", initiatedBy: "BUSINESS" },
      });
      await logAuditEvent(tx, {
        action: "BUSINESS_RELATIONSHIP_REQUESTED",
        userId: session.user.id,
        businessId,
        entityType: "BusinessCustomerRelationship",
        entityId: created.id,
      });
      return created;
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
