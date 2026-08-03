import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({ customerId: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const design = await prisma.design.findFirst({ where: { id, businessId } });
    if (!design) throw new ApiError(404, "Design not found");

    const { customerId } = schema.parse(await req.json().catch(() => ({})));

    await prisma.$transaction([
      prisma.designView.create({
        data: { businessId, designId: id, customerId, viewedById: session.user.id },
      }),
      prisma.design.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
