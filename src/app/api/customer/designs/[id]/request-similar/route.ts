import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { createSimilarDesignRequest } from "@/lib/reorder";

const schema = z.object({ note: z.string().trim().max(1000).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = schema.parse(await req.json());
    const request = await createSimilarDesignRequest(prisma, { customerProfileId: profile.id, designId: id, note: data.note });
    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
