import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { reviewSubmitSchema } from "@/lib/validations/review";
import { submitReview } from "@/lib/reviews";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = reviewSubmitSchema.parse(await req.json());

    const review = await prisma.$transaction(
      (tx) =>
        submitReview(tx, {
          orderId: id,
          customerProfileId: profile.id,
          overallRating: data.overallRating,
          bodyText: data.bodyText,
          categoryRatings: data.categoryRatings,
          photos: data.photos,
        }),
      { timeout: 20000 }
    );

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
