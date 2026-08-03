import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { reviewEditSchema } from "@/lib/validations/review";
import { editReview } from "@/lib/reviews";

const REVIEW_DETAIL_INCLUDE = {
  business: { select: { id: true, name: true, logoUrl: true } },
  order: { select: { id: true, orderCode: true } },
  customerProfile: { select: { id: true, username: true, profilePhotoUrl: true } },
  ratings: true,
  photos: true,
  response: true,
  editHistory: { orderBy: { editedAt: "asc" as const } },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const review = await prisma.review.findUnique({ where: { id }, include: REVIEW_DETAIL_INCLUDE });
    if (!review) throw new ApiError(404, "Review not found");

    if (review.status === "PUBLISHED") {
      return NextResponse.json({ review });
    }

    // Not yet published (or no longer): only the reviewer, the reviewed
    // business, or a super admin may see it.
    const session = await auth();
    const isOwnerBusiness = (session?.user?.role === "OWNER" || session?.user?.role === "STAFF") && session.user.businessId === review.businessId;
    const isAdmin = session?.user?.role === "SUPER_ADMIN";
    let isOwnerCustomer = false;
    if (session?.user?.role === "CUSTOMER") {
      const profile = await prisma.customerProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      isOwnerCustomer = profile?.id === review.customerProfileId;
    }
    if (!isOwnerCustomer && !isOwnerBusiness && !isAdmin) throw new ApiError(404, "Review not found");

    return NextResponse.json({ review });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = reviewEditSchema.parse(await req.json());

    const review = await prisma.$transaction(
      (tx) =>
        editReview(tx, {
          reviewId: id,
          customerProfileId: profile.id,
          overallRating: data.overallRating,
          bodyText: data.bodyText,
          categoryRatings: data.categoryRatings,
          photos: data.photos,
        }),
      { timeout: 20000 }
    );

    return NextResponse.json({ review });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
