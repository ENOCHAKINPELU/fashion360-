import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;
    const date = params.get("date");
    const durationMinutes = Number(params.get("durationMinutes") ?? 60);
    const staffId = params.get("staffId") || undefined;
    if (!date) throw new ApiError(400, "date is required");

    const slots = await getAvailableSlots({ businessId, date, durationMinutes, staffId });

    return NextResponse.json({ slots });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
