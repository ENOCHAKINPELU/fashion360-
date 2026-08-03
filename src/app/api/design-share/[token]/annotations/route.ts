import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { designAnnotationSchema } from "@/lib/validations/design-preview";
import { getShareOrThrow } from "@/lib/design-share";
import { logDesignActivity } from "@/lib/design-activity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getShareOrThrow(token);
    const preview = share.preview;

    const data = designAnnotationSchema.parse(await req.json());

    const version = await prisma.designVersion.findFirst({ where: { id: data.versionId, previewId: preview.id } });
    if (!version) throw new ApiError(404, "Version not found");

    const annotation = await prisma.designAnnotation.create({
      data: {
        versionId: data.versionId,
        businessId: preview.businessId,
        authorType: "CUSTOMER",
        x: data.x,
        y: data.y,
        body: data.body,
      },
    });

    await logDesignActivity(prisma, {
      previewId: preview.id,
      businessId: preview.businessId,
      type: "ANNOTATION_ADDED",
      title: "Customer pinned a note on the design",
      description: data.body.slice(0, 140),
      actorType: "CUSTOMER",
    });

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
