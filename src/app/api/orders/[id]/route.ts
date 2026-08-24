import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { orderUpdateSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { releaseIfWindowExpired } from "@/lib/payout";
import { z } from "zod";

export const ORDER_DETAIL_INCLUDE = {
  customer: {
    select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
  },
  assignedDesigner: { select: { id: true, name: true, image: true } },
  items: {
    include: {
      customization: true,
      designPreview: {
        select: { id: true, previewCode: true, status: true, previewType: true, latestVersionNumber: true, revisionCount: true },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
  timeline: { orderBy: { sortOrder: "asc" as const }, include: { actor: { select: { name: true } } } },
  productionStages: {
    orderBy: { sortOrder: "asc" as const },
    include: { files: { select: { id: true, url: true, name: true } }, completedBy: { select: { name: true } } },
  },
  // ADMIN-category notes are Fashion360-admin-only (see schema.prisma's
  // OrderNoteCategory comment) — excluded here so the business's own order
  // fetch (and anything reusing this shared include) never receives them.
  notes: { where: { category: { not: "ADMIN" } }, orderBy: { createdAt: "desc" as const }, include: { author: { select: { name: true } } } },
  files: { orderBy: { createdAt: "desc" as const }, include: { uploadedBy: { select: { name: true } } } },
  fittingSessions: {
    orderBy: { fittingDate: "desc" as const },
    include: { alterations: { orderBy: { createdAt: "desc" as const } } },
  },
  alterations: { orderBy: { createdAt: "desc" as const } },
  activities: { orderBy: { createdAt: "desc" as const }, include: { actor: { select: { name: true } } } },
  cancellation: { include: { cancelledBy: { select: { name: true } } } },
  delivery: { include: { events: { orderBy: { occurredAt: "desc" as const } } } },
  productionUpdates: { orderBy: { createdAt: "desc" as const } },
  qualityControlChecklists: { orderBy: { attemptNumber: "desc" as const }, include: { items: true, failure: true } },
  disputes: { orderBy: { createdAt: "desc" as const } },
  payout: true,
} satisfies import("@prisma/client").Prisma.OrderInclude;

export async function getScopedOrder(businessId: string, id: string) {
  const order = await prisma.order.findFirst({ where: { id, businessId } });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.order.findFirst({ where: { id, businessId }, select: { id: true } });
    if (!existing) throw new ApiError(404, "Order not found");

    // Part 21: no cron to sweep expired dispute windows — checked lazily on
    // every read instead, cheap and always fresh.
    await releaseIfWindowExpired(prisma, { orderId: id });

    const order = await prisma.order.findFirst({ where: { id, businessId }, include: ORDER_DETAIL_INCLUDE });
    if (!order) throw new ApiError(404, "Order not found");

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const actionSchema = z.object({ action: z.enum(["archive", "unarchive"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const existing = await getScopedOrder(businessId, id);

    // orderUpdateSchema's fields are all optional, so z.union([orderUpdateSchema,
    // actionSchema]) would always match orderUpdateSchema first and silently
    // drop `action` — branch on the raw body instead (same fix as the
    // appointments/design-previews PATCH routes).
    const rawBody = await req.json();
    const body = "action" in rawBody ? actionSchema.parse(rawBody) : orderUpdateSchema.parse(rawBody);

    if ("action" in body) {
      const isArchived = body.action === "archive";
      const order = await prisma.order.update({
        where: { id },
        data: { isArchived, archivedAt: isArchived ? new Date() : null },
        include: ORDER_DETAIL_INCLUDE,
      });
      await logOrderActivity(prisma, {
        orderId: id,
        businessId,
        type: isArchived ? "ORDER_ARCHIVED" : "ORDER_UPDATED",
        title: isArchived ? "Order archived" : "Order restored from archive",
        actorId: session.user.id,
      });
      return NextResponse.json({ order });
    }

    if (body.assignedDesignerId) {
      const designer = await prisma.user.findFirst({ where: { id: body.assignedDesignerId, businessId } });
      if (!designer) throw new ApiError(400, "Assigned designer not found");
    }

    const order = await prisma.$transaction(async (tx) => {
      let pricingFields = {};
      if (body.pricing) {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        const basePriceTotal = items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);

        const fabricCost = body.pricing.fabricCost ?? existing.fabricCost;
        const customizationCost = body.pricing.customizationCost ?? existing.customizationCost;
        const additionalServicesCost = body.pricing.additionalServicesCost ?? existing.additionalServicesCost;
        const deliveryFee = body.pricing.deliveryFee ?? existing.deliveryFee;
        const discount = body.pricing.discount ?? existing.discount;
        const tax = body.pricing.tax ?? existing.tax;
        const depositRequired = body.pricing.depositRequired ?? existing.depositRequired;

        const subtotal = basePriceTotal + fabricCost + customizationCost + additionalServicesCost;
        const totalValue = Math.max(0, subtotal + deliveryFee + tax - discount);
        const balanceDue = Math.max(0, totalValue - existing.amountPaid);

        pricingFields = {
          fabricCost,
          customizationCost,
          additionalServicesCost,
          deliveryFee,
          discount,
          tax,
          depositRequired,
          subtotal,
          totalValue,
          balanceDue,
        };
      }

      return tx.order.update({
        where: { id },
        data: {
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(body.expectedCompletionDate !== undefined ? { expectedCompletionDate: body.expectedCompletionDate } : {}),
          ...(body.eventDate !== undefined ? { eventDate: body.eventDate } : {}),
          ...(body.occasion !== undefined ? { occasion: body.occasion || null } : {}),
          ...(body.deliveryMethod !== undefined ? { deliveryMethod: body.deliveryMethod } : {}),
          ...(body.deliveryAddress !== undefined ? { deliveryAddress: body.deliveryAddress || null } : {}),
          ...(body.customerNotes !== undefined ? { customerNotes: body.customerNotes || null } : {}),
          ...(body.designerNotes !== undefined ? { designerNotes: body.designerNotes || null } : {}),
          ...(body.privateNotes !== undefined ? { privateNotes: body.privateNotes || null } : {}),
          ...(body.assignedDesignerId !== undefined ? { assignedDesignerId: body.assignedDesignerId || null } : {}),
          ...pricingFields,
        },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "ORDER_UPDATED",
      title: "Order details updated",
      actorId: session.user.id,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    const existing = await getScopedOrder(businessId, id);

    if (existing.status !== "DRAFT") {
      throw new ApiError(400, "Only draft orders can be deleted");
    }

    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
