import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";
import { reactivateCustomer } from "@/lib/admin-customers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();

    const profile = await prisma.customerProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!profile) throw new ApiError(404, "Customer not found");

    await reactivateCustomer(prisma, { userId: profile.userId, actorId: session.user.id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
