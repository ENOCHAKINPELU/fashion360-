import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";

const schema = z.object({ isAcceptingRequests: z.boolean() });

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const settings = await prisma.businessDiscoverySettings.upsert({
      where: { businessId },
      update: {},
      create: { businessId },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = schema.parse(await req.json());

    const settings = await prisma.businessDiscoverySettings.upsert({
      where: { businessId },
      update: { isAcceptingRequests: data.isAcceptingRequests },
      create: { businessId, isAcceptingRequests: data.isAcceptingRequests },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
