import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";

export async function GET() {
  try {
    await requireSuperAdmin();
    const requests = await prisma.reviewDeletionRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "desc" },
      include: { review: { select: { id: true, bodyText: true, overallRating: true, businessId: true, createdAt: true } } },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
