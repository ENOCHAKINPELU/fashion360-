import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { designCommentSchema } from "@/lib/validations/design-preview";
import { logDesignActivity } from "@/lib/design-activity";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedPreview(businessId, id);

    const comments = await prisma.designComment.findMany({
      where: { previewId: id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedPreview(businessId, id);

    const data = designCommentSchema.parse(await req.json());

    const comment = await prisma.designComment.create({
      data: {
        previewId: id,
        businessId,
        versionId: data.versionId || null,
        authorType: "STAFF",
        authorId: session.user.id,
        body: data.body,
        imageUrl: data.imageUrl || null,
      },
      include: { author: { select: { name: true } } },
    });

    await logDesignActivity(prisma, {
      previewId: id,
      businessId,
      type: "COMMENT_ADDED",
      title: "Comment added",
      description: data.body.slice(0, 140),
      actorId: session.user.id,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
