import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { z } from "zod";

const approvalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  comment: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const order = await prisma.order.findFirst({ where: { id, businessId } });
    if (!order) throw new ApiError(404, "Order not found");

    const body = await req.json();
    const data = approvalSchema.parse(body);

    const approval = await prisma.designApproval.create({
      data: { orderId: id, status: data.status, comment: data.comment },
    });

    if (data.status === "APPROVED" && order.stage === "DESIGN_APPROVAL") {
      await prisma.order.update({ where: { id }, data: { stage: "PRODUCTION" } });
    }

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
