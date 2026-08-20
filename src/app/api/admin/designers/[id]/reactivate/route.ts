import { NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { reactivateDesigner } from "@/lib/admin-designers";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();

    await reactivateDesigner(prisma, { businessId: id, actorId: session.user.id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
