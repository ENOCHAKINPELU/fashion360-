import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";
import { suspendCustomer } from "@/lib/admin-customers";

const schema = z.object({ reason: z.string().trim().min(1, "A reason is required") });

// [id] is CustomerProfile.id (matches the list/detail pages' URLs) — the
// suspension itself lives on User (see schema.prisma's comment on why),
// so this resolves profile -> userId before calling the shared mutation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const { reason } = schema.parse(await req.json());

    const profile = await prisma.customerProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!profile) throw new ApiError(404, "Customer not found");

    await suspendCustomer(prisma, { userId: profile.userId, reason, actorId: session.user.id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
