import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";

export async function GET() {
  try {
    await requireSuperAdmin();
    const reports = await prisma.reviewReport.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { review: { select: { id: true, bodyText: true, overallRating: true, status: true, businessId: true } } },
    });
    return NextResponse.json({ reports });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
