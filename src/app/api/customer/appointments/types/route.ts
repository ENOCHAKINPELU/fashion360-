import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";

// Only the categories Part 4 fully implements are offered to customers —
// Fitting/Other stay staff-only-bookable for now.
const BOOKABLE_CATEGORIES = ["IN_PERSON", "VIRTUAL", "MEASUREMENT"] as const;

export async function GET(req: NextRequest) {
  try {
    await requireCustomerContext();
    const businessId = req.nextUrl.searchParams.get("businessId");
    if (!businessId) throw new ApiError(400, "businessId is required");

    const types = await prisma.appointmentType.findMany({
      where: { businessId, category: { in: [...BOOKABLE_CATEGORIES] } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ types });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
