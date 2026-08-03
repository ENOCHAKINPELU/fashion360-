import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const params = req.nextUrl.searchParams;
    const businessId = params.get("businessId");
    const date = params.get("date");
    const durationMinutes = Number(params.get("durationMinutes") ?? 60);
    if (!businessId || !date) throw new ApiError(400, "businessId and date are required");

    const relationship = await prisma.businessCustomerRelationship.findUnique({
      where: { businessId_customerProfileId: { businessId, customerProfileId: profile.id } },
    });
    if (!relationship || relationship.status !== "ACTIVE") {
      throw new ApiError(403, "You need an active connection with this business to book an appointment");
    }

    const slots = await getAvailableSlots({ businessId, date, durationMinutes });

    return NextResponse.json({ slots });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
