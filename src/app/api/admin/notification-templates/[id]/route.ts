import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin, ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  titleTemplate: z.string().trim().min(1).max(200).optional(),
  bodyTemplate: z.string().trim().min(1).max(2000).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireSuperAdmin();
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const existing = await prisma.notificationTemplate.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Template not found");

    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: { ...data, updatedById: session.user.id },
    });

    await logAuditEvent(prisma, {
      action: "NOTIFICATION_TEMPLATE_UPDATED",
      userId: session.user.id,
      entityType: "NotificationTemplate",
      entityId: id,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
