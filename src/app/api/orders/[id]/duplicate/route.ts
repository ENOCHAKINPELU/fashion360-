import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { nextOrderCode } from "@/lib/order-code";
import { logOrderActivity } from "@/lib/order-activity";
import { createOrderTimeline } from "@/lib/order-timeline";
import { ensureDefaultProductionStageTemplates, createOrderProductionStages } from "@/lib/production-stages";
import { ORDER_DETAIL_INCLUDE } from "@/app/api/orders/[id]/route";

// Immediate copy-as-new-order (section 20) — unlike Reorder, nothing is
// editable first; the business just confirms, then reviews the new draft.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const original = await prisma.order.findFirst({
      where: { id, businessId },
      include: { items: { include: { customization: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!original) throw new ApiError(404, "Order not found");

    const order = await prisma.$transaction(async (tx) => {
      const orderCode = await nextOrderCode(tx, businessId);

      const created = await tx.order.create({
        data: {
          businessId,
          orderCode,
          customerId: original.customerId,
          measurementProfileId: original.measurementProfileId,
          measurementSnapshot: original.measurementSnapshot ?? undefined,
          orderType: original.orderType,
          priority: original.priority,
          status: "DRAFT",
          orderDate: new Date(),
          occasion: original.occasion,
          deliveryMethod: original.deliveryMethod,
          deliveryAddress: original.deliveryAddress,
          customerNotes: original.customerNotes,
          designerNotes: original.designerNotes,
          fabricCost: original.fabricCost,
          customizationCost: original.customizationCost,
          additionalServicesCost: original.additionalServicesCost,
          deliveryFee: original.deliveryFee,
          discount: original.discount,
          tax: original.tax,
          subtotal: original.subtotal,
          totalValue: original.totalValue,
          depositRequired: original.depositRequired,
          balanceDue: original.totalValue,
          currentStage: "Order Created",
          duplicatedFromId: original.id,
          createdById: session.user.id,
          items: {
            create: original.items.map((item, index) => ({
              businessId,
              designId: item.designId,
              designNameSnapshot: item.designNameSnapshot,
              designImageSnapshot: item.designImageSnapshot,
              designCategorySnapshot: item.designCategorySnapshot,
              isCustomDesign: item.isCustomDesign,
              customDesignDescription: item.customDesignDescription,
              basePrice: item.basePrice,
              fabricCost: item.fabricCost,
              customizationCost: item.customizationCost,
              additionalServicesCost: item.additionalServicesCost,
              subtotal: item.subtotal,
              sortOrder: index,
              customization: item.customization
                ? {
                    create: {
                      fabricId: item.customization.fabricId,
                      fabricNameSnapshot: item.customization.fabricNameSnapshot,
                      primaryColor: item.customization.primaryColor,
                      secondaryColor: item.customization.secondaryColor,
                      pattern: item.customization.pattern,
                      sleeveStyle: item.customization.sleeveStyle,
                      neckline: item.customization.neckline,
                      collarStyle: item.customization.collarStyle,
                      length: item.customization.length,
                      buttonStyle: item.customization.buttonStyle,
                      embroidery: item.customization.embroidery,
                      pocketStyle: item.customization.pocketStyle,
                      cuffStyle: item.customization.cuffStyle,
                      lining: item.customization.lining,
                      accessories: item.customization.accessories,
                      customInstructions: item.customization.customInstructions,
                      referenceImages: item.customization.referenceImages,
                    },
                  }
                : undefined,
            })),
          },
        },
        include: ORDER_DETAIL_INCLUDE,
      });

      await createOrderTimeline(tx, { orderId: created.id, businessId, orderType: created.orderType, actorId: session.user.id });
      await ensureDefaultProductionStageTemplates(tx, businessId);
      await createOrderProductionStages(tx, { orderId: created.id, businessId, orderType: created.orderType });

      return created;
    });

    await logOrderActivity(prisma, {
      orderId: order.id,
      businessId,
      type: "ORDER_DUPLICATED",
      title: `Duplicated from ${original.orderCode}`,
      actorId: session.user.id,
    });
    await logOrderActivity(prisma, {
      orderId: original.id,
      businessId,
      type: "ORDER_DUPLICATED",
      title: `Duplicated as ${order.orderCode}`,
      actorId: session.user.id,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
