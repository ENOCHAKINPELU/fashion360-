import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/rbac";
import { getRankedBusinesses } from "@/lib/discovery-ranked";

// Part 19: newer businesses doing well — never purely by review count, by
// the RISING_DESIGNER trust badge criteria instead (see lib/trust-badges.ts).
export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const result = await getRankedBusinesses({
      page,
      extraWhere: { trustBadgeAssignments: { some: { trustBadge: { type: "RISING_DESIGNER" } } } },
      orderBy: { rating: { averageRating: "desc" } },
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
