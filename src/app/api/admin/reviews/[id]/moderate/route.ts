import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { reviewModerationSchema } from "@/lib/validations/review";
import { moderateReview } from "@/lib/reviews";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const data = reviewModerationSchema.parse(await req.json());

    const review = await prisma.$transaction(
      (tx) => moderateReview(tx, { reviewId: id, action: data.action, reason: data.reason, actorId: session.user.id }),
      { timeout: 20000 }
    );
    return NextResponse.json({ review });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
