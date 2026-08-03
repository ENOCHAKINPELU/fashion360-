import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designPreviewUpdateSchema } from "@/lib/validations/design-preview";
import { logDesignActivity } from "@/lib/design-activity";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const DESIGN_PREVIEW_DETAIL_INCLUDE = {
  order: { select: { id: true, orderCode: true, totalValue: true, expectedCompletionDate: true, measurementProfileId: true } },
  customer: {
    select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
  },
  versions: {
    orderBy: { versionNumber: "desc" as const },
    include: {
      createdBy: { select: { name: true } },
      customization: true,
      model: true,
      textures: true,
      annotations: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
    },
  },
  revisionRequests: { orderBy: { createdAt: "desc" as const } },
  comments: { orderBy: { createdAt: "asc" as const }, include: { author: { select: { name: true } } } },
  approvals: { orderBy: { decidedAt: "desc" as const } },
  approvalRecord: { include: { designerConfirmedBy: { select: { name: true } } } },
  shares: { orderBy: { createdAt: "desc" as const }, include: { createdBy: { select: { name: true } } } },
  activities: { orderBy: { createdAt: "desc" as const }, include: { actor: { select: { name: true } } } },
} satisfies Prisma.DesignPreviewInclude;

export async function getScopedPreview(businessId: string, id: string) {
  const preview = await prisma.designPreview.findFirst({ where: { id, businessId } });
  if (!preview) throw new ApiError(404, "Design preview not found");
  return preview;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const preview = await prisma.designPreview.findFirst({
      where: { id, businessId },
      include: DESIGN_PREVIEW_DETAIL_INCLUDE,
    });
    if (!preview) throw new ApiError(404, "Design preview not found");

    return NextResponse.json({ preview });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedPreview(businessId, id);

    const rawBody = await req.json();
    const body = "action" in rawBody ? z.object({ action: z.enum(["archive", "unarchive"]) }).parse(rawBody) : designPreviewUpdateSchema.parse(rawBody);

    if ("action" in body) {
      const status = body.action === "archive" ? "ARCHIVED" : "DRAFT";
      const preview = await prisma.designPreview.update({
        where: { id },
        data: { status },
        include: DESIGN_PREVIEW_DETAIL_INCLUDE,
      });
      await logDesignActivity(prisma, {
        previewId: id,
        businessId,
        type: "ARCHIVED",
        title: body.action === "archive" ? "Design preview archived" : "Design preview restored",
        actorId: session.user.id,
      });
      return NextResponse.json({ preview });
    }

    const preview = await prisma.designPreview.update({
      where: { id },
      data: { ...(body.name !== undefined ? { name: body.name } : {}) },
      include: DESIGN_PREVIEW_DETAIL_INCLUDE,
    });

    return NextResponse.json({ preview });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
