import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext(["OWNER", "SUPER_ADMIN"]);
    const { id } = await params;

    const existing = await prisma.blockedDate.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Blocked date not found");

    await prisma.blockedDate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
