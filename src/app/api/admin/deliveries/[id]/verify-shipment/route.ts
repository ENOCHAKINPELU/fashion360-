import { NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { verifyShipment } from "@/lib/admin-deliveries";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireSuperAdmin();
    const { id } = await params;
    const delivery = await verifyShipment(prisma, { deliveryId: id, actorId: session.user.id });
    return NextResponse.json({ delivery });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
