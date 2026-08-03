import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { reviewResponseSchema } from "@/lib/validations/review";
import { respondToReview } from "@/lib/reviews";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, businessId } = await requireBusinessContext();
    const data = reviewResponseSchema.parse(await req.json());

    const response = await respondToReview(prisma, { reviewId: id, businessId, body: data.body, respondedById: session.user.id });
    return NextResponse.json({ response }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
