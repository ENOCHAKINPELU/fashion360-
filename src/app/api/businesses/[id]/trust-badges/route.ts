import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assignments = await prisma.trustBadgeAssignment.findMany({
      where: { businessId: id },
      include: { trustBadge: { select: { type: true, label: true, description: true } } },
      orderBy: { awardedAt: "asc" },
    });
    return NextResponse.json({ badges: assignments.map((a) => a.trustBadge) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
