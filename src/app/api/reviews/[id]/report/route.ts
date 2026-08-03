import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext, requireCustomerContext } from "@/lib/rbac";
import { reviewReportSchema } from "@/lib/validations/review";
import { reportReview } from "@/lib/reviews";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = reviewReportSchema.parse(await req.json());

    const review = await prisma.review.findUnique({ where: { id }, select: { businessId: true } });
    if (!review) throw new ApiError(404, "Review not found");

    // Either the reviewed business or the reviewing customer can report —
    // try customer context first, then fall back to business context.
    let reporterType: "CUSTOMER" | "STAFF" = "CUSTOMER";
    let reporterId: string | null = null;
    try {
      const { profile } = await requireCustomerContext();
      reporterId = profile.id;
    } catch {
      const { session, businessId } = await requireBusinessContext();
      if (businessId !== review.businessId) throw new ApiError(404, "Review not found");
      reporterType = "STAFF";
      reporterId = session.user.id;
    }

    const report = await prisma.$transaction(
      (tx) => reportReview(tx, { reviewId: id, businessId: review.businessId, reporterType, reporterId, reason: data.reason, details: data.details }),
      { timeout: 20000 }
    );

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
