import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { updateFashionGoalStatus } from "@/lib/fashion-goals";

const schema = z.object({ status: z.enum(["ACTIVE", "ACHIEVED", "DISMISSED"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = schema.parse(await req.json());
    const goal = await updateFashionGoalStatus(prisma, { id, customerProfileId: profile.id, status: data.status });
    return NextResponse.json({ goal });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
