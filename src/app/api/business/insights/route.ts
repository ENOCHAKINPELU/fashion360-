import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { getBusinessInsights } from "@/lib/business-insights";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const insights = await getBusinessInsights(prisma, businessId);
    return NextResponse.json({ insights });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
