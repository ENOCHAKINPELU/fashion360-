import type { Prisma, DeliveryStatus, DeliveryEventType, FinancialActorType, LogisticsProviderType, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";
import { resolveLogisticsProvider } from "@/lib/logistics-providers";
import { getOrCreatePlatformSettings } from "@/lib/platform-settings";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 12/14: "Ready for Delivery" and "create the shipment" are folded into
// one action — a small fashion business packs the item and hands it to a
// courier in the same moment, not as two separately-scheduled steps. Every
// Part 12 field (package weight/dimensions/addresses/contact/description)
// lives directly on the Delivery row this creates.
export async function createDeliveryForOrder(
  db: Db,
  params: {
    orderId: string;
    businessId: string;
    provider: LogisticsProviderType;
    pickupAddress: string;
    deliveryAddress: string;
    customerContactName?: string | null;
    customerContactPhone?: string | null;
    packageDescription?: string | null;
    packageWeightKg?: number | null;
    packageDimensions?: string | null;
    manualTrackingNumber?: string | null;
    manualCourierName?: string | null;
    manualCourierPhone?: string | null;
    actorId: string;
  }
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.businessId !== params.businessId) throw new ApiError(404, "Order not found");

  const lastCheck = await db.qualityControlChecklist.findFirst({ where: { orderId: params.orderId }, orderBy: { attemptNumber: "desc" } });
  if (!lastCheck || lastCheck.result !== "PASSED") {
    throw new ApiError(400, "Quality control must pass before a delivery can be created");
  }

  const existing = await db.delivery.findUnique({ where: { orderId: params.orderId } });
  if (existing) throw new ApiError(409, "A delivery already exists for this order");

  let providerFields: {
    providerDeliveryId: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    deliveryCost: number | null;
    estimatedDeliveryDate: Date | null;
    courierName: string | null;
    courierPhone: string | null;
  };

  if (params.provider === "MANUAL") {
    providerFields = {
      providerDeliveryId: null,
      trackingNumber: params.manualTrackingNumber ?? null,
      trackingUrl: null,
      deliveryCost: null,
      estimatedDeliveryDate: null,
      courierName: params.manualCourierName ?? null,
      courierPhone: params.manualCourierPhone ?? null,
    };
  } else {
    const connection = await db.logisticsProviderConnection.findFirst({
      where: { businessId: params.businessId, provider: params.provider, isActive: true, status: "CONNECTED" },
    });
    if (!connection) throw new ApiError(400, "This logistics provider isn't connected yet");
    const providerInstance = resolveLogisticsProvider(connection);
    const result = await providerInstance.createDelivery({
      reference: order.orderCode,
      pickupAddress: params.pickupAddress,
      deliveryAddress: params.deliveryAddress,
      customerContactName: params.customerContactName,
      customerContactPhone: params.customerContactPhone,
      packageDescription: params.packageDescription,
      packageWeightKg: params.packageWeightKg,
      packageDimensions: params.packageDimensions,
      callbackUrl: `${process.env.AUTH_URL ?? "http://localhost:3000"}/dashboard/orders/${params.orderId}`,
    });
    providerFields = {
      providerDeliveryId: result.providerDeliveryId,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl,
      deliveryCost: result.deliveryCost,
      estimatedDeliveryDate: result.estimatedDeliveryDate,
      courierName: null,
      courierPhone: null,
    };
  }

  const delivery = await db.delivery.create({
    data: {
      orderId: params.orderId,
      businessId: params.businessId,
      provider: params.provider,
      status: "CREATED",
      pickupAddress: params.pickupAddress,
      deliveryAddress: params.deliveryAddress,
      customerContactName: params.customerContactName,
      customerContactPhone: params.customerContactPhone,
      packageDescription: params.packageDescription,
      packageWeightKg: params.packageWeightKg,
      packageDimensions: params.packageDimensions,
      createdById: params.actorId,
      ...providerFields,
    },
  });

  await db.deliveryEvent.create({
    data: { deliveryId: delivery.id, businessId: params.businessId, type: "CREATED", status: "CREATED", actorType: "STAFF", actorId: params.actorId },
  });

  await db.order.update({ where: { id: params.orderId }, data: { status: "READY_FOR_PICKUP", currentStage: "Ready for Delivery" } });
  await markOrderTimelineStage(db, { orderId: params.orderId, businessId: params.businessId, stage: "READY_FOR_PICKUP", status: "COMPLETED", actorId: params.actorId });
  await markOrderTimelineStage(db, { orderId: params.orderId, businessId: params.businessId, stage: "DELIVERY_CREATED", status: "COMPLETED", actorId: params.actorId });
  await logOrderActivity(db, { orderId: params.orderId, businessId: params.businessId, type: "DELIVERY_CREATED", title: "Delivery created", actorId: params.actorId });
  await notifyFinancialEvent(db, {
    businessId: params.businessId,
    orderId: params.orderId,
    assignedDesignerId: order.assignedDesignerId,
    title: "Delivery created",
    body: `A delivery was created for ${order.orderCode}.`,
    type: "info",
  });

  if (order.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "Your order is ready for delivery",
      body: "Your outfit is ready and will be dispatched soon.",
      type: "success",
    });
  }

  return delivery;
}

const DELIVERY_STATUS_TO_TIMELINE: Partial<Record<DeliveryStatus, "COURIER_ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED">> = {
  COURIER_ASSIGNED: "COURIER_ASSIGNED",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

const DELIVERY_STATUS_TO_ORDER_STATUS: Partial<Record<DeliveryStatus, OrderStatus>> = {
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

// Part 15/16: the one place a Delivery's status actually changes — called
// from both the manual staff-update route and (once verified) the webhook
// route, so a status can never move without an accompanying DeliveryEvent.
export async function recordDeliveryEvent(
  db: Db,
  params: {
    deliveryId: string;
    businessId: string;
    type: DeliveryEventType;
    status: DeliveryStatus;
    description?: string | null;
    location?: string | null;
    actorType: FinancialActorType;
    actorId?: string | null;
  }
) {
  const delivery = await db.delivery.findUniqueOrThrow({ where: { id: params.deliveryId } });
  if (delivery.businessId !== params.businessId) throw new ApiError(404, "Delivery not found");

  const order = await db.order.findUniqueOrThrow({ where: { id: delivery.orderId } });

  await db.deliveryEvent.create({
    data: {
      deliveryId: params.deliveryId,
      businessId: params.businessId,
      type: params.type,
      status: params.status,
      description: params.description,
      location: params.location,
      actorType: params.actorType,
      actorId: params.actorId,
    },
  });

  const settings = params.status === "DELIVERED" ? await getOrCreatePlatformSettings(db) : null;

  const updatedDelivery = await db.delivery.update({
    where: { id: params.deliveryId },
    data: {
      status: params.status,
      pickedUpAt: params.status === "PICKED_UP" ? new Date() : undefined,
      deliveredAt: params.status === "DELIVERED" ? new Date() : undefined,
      failureReason: params.status === "FAILED" ? (params.description ?? "Delivery failed") : undefined,
      confirmationDeadline:
        params.status === "DELIVERED" && settings ? new Date(Date.now() + settings.disputeWindowDays * 24 * 60 * 60 * 1000) : undefined,
    },
  });

  const timelineStage = DELIVERY_STATUS_TO_TIMELINE[params.status];
  if (timelineStage) {
    await markOrderTimelineStage(db, { orderId: delivery.orderId, businessId: params.businessId, stage: timelineStage, status: "COMPLETED", actorId: params.actorId });
  }

  const orderStatus = DELIVERY_STATUS_TO_ORDER_STATUS[params.status];
  if (orderStatus) {
    await db.order.update({ where: { id: delivery.orderId }, data: { status: orderStatus } });
  }

  await logOrderActivity(db, {
    orderId: delivery.orderId,
    businessId: params.businessId,
    type: "DELIVERY_STATUS_CHANGED",
    title: `Delivery status: ${params.status.replace(/_/g, " ")}`,
    description: params.description ?? undefined,
    actorId: params.actorId,
  });

  if (order.customerProfileId) {
    const customerCopy = customerDeliveryMessage(params.status);
    if (customerCopy) {
      await notifyCustomer(db, {
        businessId: params.businessId,
        customerProfileId: order.customerProfileId,
        title: customerCopy.title,
        body: customerCopy.body,
        type: params.status === "FAILED" ? "danger" : "info",
      });
    }
  }

  if (params.status === "DELIVERED") {
    await notifyFinancialEvent(db, {
      businessId: params.businessId,
      orderId: delivery.orderId,
      assignedDesignerId: order.assignedDesignerId,
      title: "Order delivered",
      body: `${order.orderCode} was marked delivered. Awaiting customer confirmation.`,
      type: "success",
    });
  }

  return updatedDelivery;
}

function customerDeliveryMessage(status: DeliveryStatus): { title: string; body: string } | null {
  switch (status) {
    case "COURIER_ASSIGNED":
      return { title: "Courier assigned", body: "A courier has been assigned to deliver your order." };
    case "PICKED_UP":
      return { title: "Order picked up", body: "Your order has been picked up by the courier." };
    case "IN_TRANSIT":
      return { title: "Order in transit", body: "Your order is on its way." };
    case "OUT_FOR_DELIVERY":
      return { title: "Out for delivery", body: "Your order is out for delivery today." };
    case "DELIVERED":
      return { title: "Your order has been delivered", body: "Please confirm receipt or report a problem." };
    case "FAILED":
      return { title: "Delivery attempt failed", body: "We couldn't complete delivery. The business has been notified." };
    case "RETURNED":
      return { title: "Package returned", body: "Your package is being returned to the business." };
    default:
      return null;
  }
}
