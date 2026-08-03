import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { respondToDispute } from "@/lib/dispute";

const schema = z.object({ body: z.string().trim().min(1, "Message is required") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = schema.parse(await req.json());

    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute || dispute.customerProfileId !== profile.id) throw new ApiError(404, "Dispute not found");

    const response = await prisma.$transaction((tx) =>
      respondToDispute(tx, { disputeId: id, businessId: dispute.businessId, authorType: "CUSTOMER", authorId: null, body: data.body })
    );

    return NextResponse.json({ response }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
