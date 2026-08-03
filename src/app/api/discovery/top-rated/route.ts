import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/rbac";
import { getRankedBusinesses } from "@/lib/discovery-ranked";

// Part 16/19: a floor of 3 reviews so a single 5-star review can't outrank
// an established business with dozens of strong reviews.
export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const result = await getRankedBusinesses({
      page,
      extraWhere: { rating: { totalReviews: { gte: 3 } } },
      orderBy: { rating: { averageRating: "desc" } },
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
