import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { orderCreateSchema } from "@/lib/validations/order";
import { nextOrderCode } from "@/lib/order-code";
import { nextCustomerCode } from "@/lib/customer-code";
import { logCustomerActivity } from "@/lib/customer-activity";
import { logOrderActivity } from "@/lib/order-activity";
import { createOrderTimeline } from "@/lib/order-timeline";
import { ensureDefaultProductionStageTemplates, createOrderProductionStages } from "@/lib/production-stages";
import type { Prisma, OrderStatus, OrderPriority, OrderType, OrderPaymentStatus } from "@prisma/client";

const PAGE_SIZE = 20;

const ORDER_LIST_INCLUDE = {
  customer: {
    select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
  },
  assignedDesigner: { select: { id: true, name: true, image: true } },
  items: { select: { designNameSnapshot: true, designCategorySnapshot: true }, orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.OrderInclude;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const search = params.get("search")?.trim();
    const status = params.get("status") as OrderStatus | null;
    const paymentStatus = params.get("paymentStatus") as OrderPaymentStatus | null;
    const orderType = params.get("orderType") as OrderType | null;
    const priority = params.get("priority") as OrderPriority | null;
    const customerId = params.get("customerId");
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const archived = params.get("archived") === "true";
    const sort = params.get("sort") ?? "orderDate:desc";
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? PAGE_SIZE)));

    const where: Prisma.OrderWhereInput = {
      businessId,
      isArchived: archived,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(orderType ? { orderType } : {}),
      ...(priority ? { priority } : {}),
      ...(customerId ? { customerId } : {}),
      ...(dateFrom || dateTo
        ? {
            orderDate: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderCode: { contains: search, mode: "insensitive" } },
              { customer: { firstName: { contains: search, mode: "insensitive" } } },
              { customer: { lastName: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
              { customer: { email: { contains: search, mode: "insensitive" } } },
              { items: { some: { designNameSnapshot: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];
    const orderBy: Prisma.OrderOrderByWithRelationInput = { [sortField]: sortDir };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: ORDER_LIST_INCLUDE,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = orderCreateSchema.parse(await req.json());

    if (data.assignedDesignerId) {
      const designer = await prisma.user.findFirst({ where: { id: data.assignedDesignerId, businessId } });
      if (!designer) throw new ApiError(400, "Assigned designer not found");
    }

    const order = await prisma.$transaction(async (tx) => {
      let customerId = data.customerId;

      if (!customerId && data.newCustomer) {
        const customerCode = await nextCustomerCode(tx, businessId);
        const customer = await tx.customer.create({
          data: {
            businessId,
            customerCode,
            firstName: data.newCustomer.firstName,
            lastName: data.newCustomer.lastName,
            email: data.newCustomer.email || null,
            phone: data.newCustomer.phone || null,
          },
        });
        await logCustomerActivity(tx, {
          customerId: customer.id,
          businessId,
          type: "CUSTOMER_CREATED",
          title: "Customer profile created",
          actorId: session.user.id,
        });
        customerId = customer.id;
      }
      if (!customerId) throw new ApiError(400, "A customer is required");

      const customer = await tx.customer.findFirst({ where: { id: customerId, businessId } });
      if (!customer) throw new ApiError(404, "Customer not found");

      let measurementSnapshot = data.measurementSnapshot ?? null;
      if (data.measurementProfileId) {
        const profile = await tx.measurementProfile.findFirst({
          where: { id: data.measurementProfileId, businessId, customerId },
          include: { measurements: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
        if (!profile) throw new ApiError(404, "Measurement profile not found");
        if (!measurementSnapshot && profile.measurements[0]) {
          measurementSnapshot = profile.measurements[0].values as Record<string, number>;
        }
      }

      // Re-derive design/fabric snapshots server-side so a tampered client
      // payload can't misrepresent a catalogued Design's name/image/price.
      let designNameSnapshot = data.item.designNameSnapshot ?? null;
      let designImageSnapshot = data.item.designImageSnapshot ?? null;
      let designCategorySnapshot = data.item.designCategorySnapshot ?? null;
      let basePrice = data.item.basePrice;

      if (data.item.designId) {
        const design = await tx.design.findFirst({
          where: { id: data.item.designId, businessId },
          include: { category: true },
        });
        if (!design) throw new ApiError(404, "Design not found");
        designNameSnapshot = design.name;
        designImageSnapshot = design.mainImageUrl;
        designCategorySnapshot = design.category?.name ?? null;
        basePrice = design.basePrice ?? basePrice;
      }

      let fabricNameSnapshot = data.item.customization.fabricNameSnapshot ?? null;
      if (data.item.customization.fabricId) {
        const fabric = await tx.fabricLibraryItem.findFirst({
          where: { id: data.item.customization.fabricId, businessId },
        });
        if (!fabric) throw new ApiError(404, "Fabric not found");
        fabricNameSnapshot = fabric.name;
      }

      const { fabricCost, customizationCost, additionalServicesCost, deliveryFee, discount, tax, depositRequired } =
        data.pricing;
      const itemSubtotal = basePrice + fabricCost + customizationCost + additionalServicesCost;
      const subtotal = itemSubtotal;
      const totalValue = Math.max(0, subtotal + deliveryFee + tax - discount);

      const orderCode = await nextOrderCode(tx, businessId);
      const status: OrderStatus = data.saveAsDraft ? "DRAFT" : "PENDING_CONFIRMATION";

      const created = await tx.order.create({
        data: {
          businessId,
          orderCode,
          customerId,
          measurementProfileId: data.measurementProfileId || null,
          measurementSnapshot: measurementSnapshot ?? undefined,
          orderType: data.orderType,
          priority: data.priority,
          status,
          orderDate: data.orderDate,
          expectedCompletionDate: data.expectedCompletionDate,
          eventDate: data.eventDate,
          occasion: data.occasion || null,
          deliveryMethod: data.deliveryMethod,
          deliveryAddress: data.deliveryAddress || null,
          customerNotes: data.customerNotes || null,
          designerNotes: data.designerNotes || null,
          privateNotes: data.privateNotes || null,
          fabricCost,
          customizationCost,
          additionalServicesCost,
          deliveryFee,
          discount,
          tax,
          subtotal,
          totalValue,
          depositRequired,
          balanceDue: totalValue,
          currentStage: "Order Created",
          assignedDesignerId: data.assignedDesignerId || null,
          reorderedFromId: data.reorderedFromId || null,
          createdById: session.user.id,
          items: {
            create: [
              {
                businessId,
                designId: data.item.designId || null,
                designNameSnapshot,
                designImageSnapshot,
                designCategorySnapshot,
                isCustomDesign: data.item.isCustomDesign,
                customDesignDescription: data.item.customDesignDescription || null,
                basePrice,
                fabricCost,
                customizationCost,
                additionalServicesCost,
                subtotal: itemSubtotal,
                customization: {
                  create: {
                    fabricId: data.item.customization.fabricId || null,
                    fabricNameSnapshot,
                    primaryColor: data.item.customization.primaryColor || null,
                    secondaryColor: data.item.customization.secondaryColor || null,
                    pattern: data.item.customization.pattern || null,
                    sleeveStyle: data.item.customization.sleeveStyle || null,
                    neckline: data.item.customization.neckline || null,
                    collarStyle: data.item.customization.collarStyle || null,
                    length: data.item.customization.length || null,
                    buttonStyle: data.item.customization.buttonStyle || null,
                    embroidery: data.item.customization.embroidery || null,
                    pocketStyle: data.item.customization.pocketStyle || null,
                    cuffStyle: data.item.customization.cuffStyle || null,
                    lining: data.item.customization.lining || null,
                    accessories: data.item.customization.accessories,
                    customInstructions: data.item.customization.customInstructions || null,
                    referenceImages: data.item.customization.referenceImages,
                  },
                },
              },
            ],
          },
        },
        include: ORDER_LIST_INCLUDE,
      });

      await createOrderTimeline(tx, { orderId: created.id, businessId, orderType: created.orderType, actorId: session.user.id });
      await ensureDefaultProductionStageTemplates(tx, businessId);
      await createOrderProductionStages(tx, { orderId: created.id, businessId, orderType: created.orderType });

      await logOrderActivity(tx, {
        orderId: created.id,
        businessId,
        type: "ORDER_CREATED",
        title: "Order created",
        description: `${created.orderCode} created for ${customer.firstName} ${customer.lastName}`,
        actorId: session.user.id,
      });
      await logCustomerActivity(tx, {
        customerId,
        businessId,
        type: "ORDER_CREATED",
        title: `Order ${created.orderCode} created`,
        actorId: session.user.id,
      });

      if (data.reorderedFromId) {
        const original = await tx.order.findFirst({ where: { id: data.reorderedFromId, businessId } });
        if (original) {
          await logOrderActivity(tx, {
            orderId: original.id,
            businessId,
            type: "ORDER_REORDERED",
            title: `Reordered as ${created.orderCode}`,
            actorId: session.user.id,
          });
        }
      }

      return created;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
