import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { z } from "zod";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();

    const notifications = await prisma.notification.findMany({
      where: { customerProfileId: profile.id },
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
    const { profile } = await requireCustomerContext();
    const { id, markAllRead } = patchSchema.parse(await req.json());

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { customerProfileId: profile.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (id) {
      await prisma.notification.updateMany({
        where: { id, customerProfileId: profile.id },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
