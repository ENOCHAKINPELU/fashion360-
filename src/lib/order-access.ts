import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";

// Part 20/31: the access gate for the new pre-order Order flow (an Order
// with customerProfileId set) — mirrors loadCustomerDesignProject /
// loadCustomerQuotation exactly. An Order created by the legacy staff
// wizard has no customerProfileId and is simply never reachable here.
export async function loadCustomerOrder(id: string, customerProfileId: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.customerProfileId !== customerProfileId) throw new ApiError(404, "Order not found");
  return order;
}
