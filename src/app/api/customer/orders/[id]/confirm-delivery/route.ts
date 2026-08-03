import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { confirmCustomerDelivery } from "@/lib/payout";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const delivery = await prisma.$transaction((tx) => confirmCustomerDelivery(tx, { orderId: id, customerProfileId: profile.id }));
    return NextResponse.json({ delivery });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
