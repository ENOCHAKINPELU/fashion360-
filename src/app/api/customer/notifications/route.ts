import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { markInAppNotificationLogsRead } from "@/lib/notification-center";
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
      const targets = await prisma.notification.findMany({
        where: { customerProfileId: profile.id, readAt: null },
        select: { id: true },
      });
      await prisma.notification.updateMany({
        where: { id: { in: targets.map((t) => t.id) } },
        data: { readAt: new Date() },
      });
      await markInAppNotificationLogsRead(prisma, { notificationIds: targets.map((t) => t.id) });
    } else if (id) {
      await prisma.notification.updateMany({
        where: { id, customerProfileId: profile.id },
        data: { readAt: new Date() },
      });
      await markInAppNotificationLogsRead(prisma, { notificationIds: [id] });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
