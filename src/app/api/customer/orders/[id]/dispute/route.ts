import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerOrder } from "@/lib/order-access";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    await loadCustomerOrder(id, profile.id);

    const dispute = await prisma.dispute.findFirst({
      where: { orderId: id, customerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        evidence: { orderBy: { createdAt: "asc" } },
        responses: { orderBy: { createdAt: "asc" } },
        resolution: true,
      },
    });
    return NextResponse.json({ dispute });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
