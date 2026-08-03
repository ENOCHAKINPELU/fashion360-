import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { resumeProductionAfterQualityFailure } from "@/lib/quality-control";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const order = await prisma.$transaction((tx) => resumeProductionAfterQualityFailure(tx, { orderId: id, businessId, actorId: session.user.id }));
    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
