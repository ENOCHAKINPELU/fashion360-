import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { getOrCreateRankingFactors } from "@/lib/ranking-factors";

export async function GET() {
  try {
    await requireSuperAdmin();
    const factors = await getOrCreateRankingFactors(prisma);
    return NextResponse.json({ factors });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const updateSchema = z.object({ updates: z.array(z.object({ key: z.string(), weight: z.number().min(0).max(100) })).min(1) });

// Part 17: the only place ranking weights can change — never hard-coded,
// never business-editable.
export async function PUT(req: NextRequest) {
  try {
    const { session } = await requireSuperAdmin();
    const data = updateSchema.parse(await req.json());

    await prisma.$transaction(
      data.updates.map((u) => prisma.rankingFactor.update({ where: { key: u.key }, data: { weight: u.weight, updatedById: session.user.id } }))
    );

    const factors = await prisma.rankingFactor.findMany();
    return NextResponse.json({ factors });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
