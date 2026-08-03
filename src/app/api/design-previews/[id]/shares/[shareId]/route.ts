import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logDesignActivity } from "@/lib/design-activity";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id, shareId } = await params;
    await getScopedPreview(businessId, id);

    const share = await prisma.designShare.findFirst({ where: { id: shareId, previewId: id } });
    if (!share) throw new ApiError(404, "Share link not found");

    await prisma.designShare.update({ where: { id: shareId }, data: { revokedAt: new Date() } });

    await logDesignActivity(prisma, {
      previewId: id,
      businessId,
      type: "SHARE_REVOKED",
      title: "Share link revoked",
      actorId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
