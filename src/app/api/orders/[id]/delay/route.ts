import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { flagProductionDelay } from "@/lib/production";

const schema = z.object({
  reason: z.string().trim().min(1, "Reason is required"),
  updatedExpectedCompletionDate: z.string().min(1, "Provide a new expected completion date"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const data = schema.parse(await req.json());

    const order = await prisma.$transaction((tx) =>
      flagProductionDelay(tx, {
        orderId: id,
        businessId,
        reason: data.reason,
        updatedExpectedCompletionDate: new Date(data.updatedExpectedCompletionDate),
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
