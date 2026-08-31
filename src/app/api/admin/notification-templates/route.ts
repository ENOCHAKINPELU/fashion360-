import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { ensureDefaultTemplates } from "@/lib/notification-templates";

export async function GET() {
  try {
    await requireSuperAdmin();
    await ensureDefaultTemplates(prisma);
    const templates = await prisma.notificationTemplate.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ templates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  key: z.string().trim().min(1).max(60).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only"),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]),
  event: z
    .enum([
      "CUSTOMER_REGISTERED", "DESIGNER_REGISTERED", "DESIGNER_VERIFIED", "REQUEST_SUBMITTED", "REQUEST_ACCEPTED",
      "ORDER_CREATED", "PAYMENT_RECEIVED", "ESCROW_CREATED", "PRODUCTION_STARTED", "PRODUCTION_COMPLETED",
      "COURIER_ASSIGNED", "SHIPMENT_PICKED_UP", "DELIVERY_COMPLETED", "REVIEW_SUBMITTED", "DISPUTE_OPENED",
      "REFUND_APPROVED", "ACCOUNT_SUSPENDED", "PASSWORD_RESET", "BROADCAST", "SYSTEM",
    ])
    .optional(),
  titleTemplate: z.string().trim().min(1).max(200),
  bodyTemplate: z.string().trim().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireSuperAdmin();
    const data = createSchema.parse(await req.json());

    const template = await prisma.notificationTemplate.create({
      data: { ...data, updatedById: session.user.id },
    });

    await logAuditEvent(prisma, {
      action: "NOTIFICATION_TEMPLATE_CREATED",
      userId: session.user.id,
      entityType: "NotificationTemplate",
      entityId: template.id,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
