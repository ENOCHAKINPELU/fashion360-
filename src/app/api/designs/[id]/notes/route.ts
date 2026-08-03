import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designNoteSchema } from "@/lib/validations/design";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const design = await prisma.design.findFirst({ where: { id, businessId } });
    if (!design) throw new ApiError(404, "Design not found");

    const notes = await prisma.designNote.findMany({
      where: { designId: id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const design = await prisma.design.findFirst({ where: { id, businessId } });
    if (!design) throw new ApiError(404, "Design not found");

    const data = designNoteSchema.parse(await req.json());

    const note = await prisma.designNote.create({
      data: { designId: id, category: data.category, body: data.body, authorId: session.user.id },
      include: { author: { select: { name: true } } },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
