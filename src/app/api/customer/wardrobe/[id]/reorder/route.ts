import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { createReorderRequest } from "@/lib/reorder";

const schema = z.object({
  changeColor: z.string().trim().max(100).optional(),
  changeFabric: z.string().trim().max(100).optional(),
  requestMeasurementUpdate: z.boolean().optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = schema.parse(await req.json());
    const request = await createReorderRequest(prisma, { customerProfileId: profile.id, wardrobeItemId: id, ...data });
    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
