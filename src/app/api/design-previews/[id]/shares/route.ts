import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { designShareCreateSchema } from "@/lib/validations/design-preview";
import { generateShareToken } from "@/lib/design-share";
import { logDesignActivity } from "@/lib/design-activity";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedPreview(businessId, id);

    const shares = await prisma.designShare.findMany({
      where: { previewId: id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });

    return NextResponse.json({ shares });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedPreview(businessId, id);

    const data = designShareCreateSchema.parse(await req.json());

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const share = await prisma.$transaction(async (tx) => {
      const created = await tx.designShare.create({
        data: {
          previewId: id,
          businessId,
          token: generateShareToken(),
          channel: data.channel,
          expiresAt,
          createdById: session.user.id,
        },
        include: { createdBy: { select: { name: true } } },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId,
        type: "SHARE_CREATED",
        title: `Share link created (${data.channel.toLowerCase()})`,
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
