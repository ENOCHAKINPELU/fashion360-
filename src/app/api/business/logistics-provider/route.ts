import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const connections = await prisma.logisticsProviderConnection.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      include: { connectedBy: { select: { name: true } } },
    });
    return NextResponse.json({ connections });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Part 13/14: the MOCK provider needs no credentials at all (unlike a real
// courier), so connecting it is a one-click action rather than a form —
// mirrors how the payment MOCK provider is pre-connectable without keys.
export async function POST(_req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const provider = "MOCK" as const;

    const connection = await prisma.$transaction(async (tx) => {
      await tx.logisticsProviderConnection.updateMany({ where: { businessId, NOT: { provider } }, data: { isActive: false } });
      return tx.logisticsProviderConnection.upsert({
        where: { businessId_provider: { businessId, provider } },
        create: { businessId, provider, status: "CONNECTED", isActive: true, connectedById: session.user.id, connectedAt: new Date() },
        update: { status: "CONNECTED", isActive: true, connectedById: session.user.id, connectedAt: new Date(), disconnectedAt: null },
      });
    });

    return NextResponse.json({ connected: true, provider: connection.provider, status: connection.status });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
