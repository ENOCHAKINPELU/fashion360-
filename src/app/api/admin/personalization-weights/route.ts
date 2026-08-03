import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { getOrCreatePersonalizationWeights } from "@/lib/personalization-weights";

export async function GET() {
  try {
    await requireSuperAdmin();
    const weights = await getOrCreatePersonalizationWeights(prisma);
    return NextResponse.json({ weights });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const updateSchema = z.object({ updates: z.array(z.object({ key: z.string(), weight: z.number().min(-100).max(100) })).min(1) });

export async function PUT(req: NextRequest) {
  try {
    const { session } = await requireSuperAdmin();
    const data = updateSchema.parse(await req.json());

    await prisma.$transaction(data.updates.map((u) => prisma.personalizationWeight.update({ where: { key: u.key }, data: { weight: u.weight, updatedById: session.user.id } })));

    const weights = await prisma.personalizationWeight.findMany();
    return NextResponse.json({ weights });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
