import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designAnnotationSchema } from "@/lib/validations/design-preview";
import { logDesignActivity } from "@/lib/design-activity";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id, versionId } = await params;
    await getScopedPreview(businessId, id);

    const version = await prisma.designVersion.findFirst({ where: { id: versionId, previewId: id } });
    if (!version) throw new ApiError(404, "Version not found");

    const data = designAnnotationSchema.parse(await req.json());

    const annotation = await prisma.designAnnotation.create({
      data: {
        versionId,
        businessId,
        authorType: "STAFF",
        authorId: session.user.id,
        x: data.x,
        y: data.y,
        body: data.body,
      },
      include: { author: { select: { name: true } } },
    });

    await logDesignActivity(prisma, {
      previewId: id,
      businessId,
      type: "ANNOTATION_ADDED",
      title: "Annotation added",
      description: data.body.slice(0, 140),
      actorId: session.user.id,
    });

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
