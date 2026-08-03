import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";

// Part 20: never expose factorsSnapshot (the internal weighting breakdown)
// on the public API — only the final score, which the UI turns into trust
// badges/signals, not a raw leaderboard number.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ranking = await prisma.businessRanking.findUnique({ where: { businessId: id }, select: { score: true, computedAt: true } });
    return NextResponse.json({ ranking: ranking ?? { score: 0, computedAt: null } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
