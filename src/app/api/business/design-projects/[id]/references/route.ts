import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { designReferenceCreateSchema } from "@/lib/validations/design-project";
import { loadBusinessDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);
    const references = await prisma.designReference.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ references });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);
    const data = designReferenceCreateSchema.parse(await req.json());

    const reference = await prisma.designReference.create({
      data: {
        previewId: id,
        fileUrl: data.fileUrl,
        title: data.title,
        type: data.type,
        description: data.description || null,
        uploadedById: session.user.id,
      },
    });

    await logDesignActivity(prisma, {
      previewId: id,
      businessId,
      type: "DESIGNER_UPDATED",
      title: `Reference added: ${data.title}`,
      actorId: session.user.id,
    });

    return NextResponse.json({ reference }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
