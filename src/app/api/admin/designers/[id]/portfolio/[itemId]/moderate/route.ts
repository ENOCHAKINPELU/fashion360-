import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { moderatePortfolioItem } from "@/lib/admin-designers";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "UPDATE_REQUESTED"]),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id, itemId } = await params;
    const { session } = await requireSuperAdmin();
    const { decision, note } = schema.parse(await req.json());

    await moderatePortfolioItem(prisma, { itemId, businessId: id, decision, note, actorId: session.user.id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
