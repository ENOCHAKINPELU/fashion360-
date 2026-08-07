import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

// List every conversation this business has, most recently active first.
export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const conversations = await prisma.conversation.findMany({
      where: { businessId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      include: {
        customerProfile: { select: { id: true, user: { select: { name: true, image: true } } } },
      },
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const startSchema = z.object({ customerId: z.string().min(1, "customerId is required") });

// Starts (or resumes) a conversation from a business contact record — looks
// up the linked self-service CustomerProfile via the established
// BusinessCustomerRelationship (a Customer with no linked profile has no
// account to read a message in, so that's a clear error, not a silent no-op).
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const { customerId } = startSchema.parse(await req.json());

    const relationship = await prisma.businessCustomerRelationship.findFirst({
      where: { businessId, linkedCustomerId: customerId },
      select: { customerProfileId: true },
    });
    if (!relationship) {
      throw new ApiError(404, "This customer has no linked Fashion360 account to message yet");
    }

    const conversation = await prisma.conversation.upsert({
      where: { businessId_customerProfileId: { businessId, customerProfileId: relationship.customerProfileId } },
      update: {},
      create: { businessId, customerProfileId: relationship.customerProfileId },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
