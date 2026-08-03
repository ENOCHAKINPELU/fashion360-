import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id, shareId } = await params;
    await getScopedQuotation(businessId, id);

    const share = await prisma.quotationShare.findFirst({ where: { id: shareId, quotationId: id } });
    if (!share) throw new ApiError(404, "Share link not found");

    await prisma.quotationShare.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
