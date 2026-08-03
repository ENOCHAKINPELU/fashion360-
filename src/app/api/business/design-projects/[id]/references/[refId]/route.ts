import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { loadBusinessDesignProject } from "@/lib/design-project";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; refId: string }> }) {
  try {
    const { id, refId } = await params;
    const { businessId } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);

    const reference = await prisma.designReference.findUnique({ where: { id: refId } });
    if (!reference || reference.previewId !== id) throw new ApiError(404, "Reference not found");

    await prisma.designReference.delete({ where: { id: refId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
