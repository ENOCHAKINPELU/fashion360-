import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { getOccasionDiscovery } from "@/lib/occasion-discovery";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ occasion: string }> }) {
  try {
    await requireCustomerContext();
    const { occasion } = await params;

    const result = await getOccasionDiscovery(prisma, occasion);
    if (!result) throw new ApiError(404, "Unknown occasion");

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
