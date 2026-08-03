import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { respondToProductionDelay } from "@/lib/production";

const schema = z.object({
  action: z.enum(["accept", "request-cancellation", "report-issue"]),
  note: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = schema.parse(await req.json());

    const order = await prisma.$transaction((tx) =>
      respondToProductionDelay(tx, { orderId: id, customerProfileId: profile.id, action: data.action, note: data.note })
    );

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
