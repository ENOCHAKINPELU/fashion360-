import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { getReviewableOrders } from "@/lib/review-eligibility";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();

    const [reviews, reviewableOrders] = await Promise.all([
      prisma.review.findMany({
        where: { customerProfileId: profile.id },
        orderBy: { createdAt: "desc" },
        include: {
          business: { select: { id: true, name: true, logoUrl: true } },
          order: { select: { id: true, orderCode: true } },
          ratings: true,
          photos: true,
          response: true,
        },
      }),
      getReviewableOrders(prisma, profile.id),
    ]);

    return NextResponse.json({ reviews, reviewableOrders });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
