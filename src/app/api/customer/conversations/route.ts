import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const conversations = await prisma.conversation.findMany({
      where: { customerProfileId: profile.id },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      include: { business: { select: { id: true, name: true, logoUrl: true } } },
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const startSchema = z.object({ businessId: z.string().min(1, "businessId is required") });

// A customer can message any business directly — no prior relationship
// required, unlike the business-initiated case (which needs a linked
// Customer contact to resolve to a profile). Browsing a business's public
// profile is enough context to start a real conversation.
export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const { businessId } = startSchema.parse(await req.json());

    const conversation = await prisma.conversation.upsert({
      where: { businessId_customerProfileId: { businessId, customerProfileId: profile.id } },
      update: {},
      create: { businessId, customerProfileId: profile.id },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
