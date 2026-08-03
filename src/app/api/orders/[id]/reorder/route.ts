import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

// Returns a prefill payload shaped like the order creation wizard's state —
// it does NOT create anything. The business reviews/edits every field in the
// wizard before a fresh POST /api/orders actually places the new order.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, businessId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
        },
        items: { include: { customization: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!order) throw new ApiError(404, "Order not found");

    const item = order.items[0];

    const prefill = {
      reorderedFromId: order.id,
      customerId: order.customerId,
      customer: order.customer,
      measurementProfileId: order.measurementProfileId,
      measurementSnapshot: order.measurementSnapshot,
      orderType: order.orderType,
      occasion: order.occasion,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: order.deliveryAddress,
      customerNotes: order.customerNotes,
      item: item
        ? {
            designId: item.designId,
            designNameSnapshot: item.designNameSnapshot,
            designImageSnapshot: item.designImageSnapshot,
            designCategorySnapshot: item.designCategorySnapshot,
            isCustomDesign: item.isCustomDesign,
            customDesignDescription: item.customDesignDescription,
            basePrice: item.basePrice,
            customization: item.customization,
          }
        : null,
    };

    return NextResponse.json({ prefill });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
