import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { z } from "zod";

export async function GET() {
  try {
    const { businessId, session } = await requireBusinessContext();

    const notifications = await prisma.notification.findMany({
      where: { businessId, OR: [{ userId: session.user.id }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({ id: z.string().optional(), markAllRead: z.boolean().optional() });

export async function PATCH(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id, markAllRead } = patchSchema.parse(await req.json());

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { businessId, OR: [{ userId: session.user.id }, { userId: null }], readAt: null },
        data: { readAt: new Date() },
      });
    } else if (id) {
      await prisma.notification.updateMany({
        where: { id, businessId },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
