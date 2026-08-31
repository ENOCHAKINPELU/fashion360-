import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin, ApiError } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true, email: true } }, cancelledBy: { select: { name: true, email: true } } },
    });
    if (!broadcast) throw new ApiError(404, "Broadcast not found");
    return NextResponse.json({ broadcast });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
