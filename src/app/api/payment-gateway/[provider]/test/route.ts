import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { resolvePaymentProvider } from "@/lib/payment-providers";
import type { PaymentProviderType } from "@prisma/client";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { provider: providerParam } = await params;
    const provider = providerParam.toUpperCase() as PaymentProviderType;

    const connection = await prisma.paymentGatewayConnection.findUnique({
      where: { businessId_provider: { businessId, provider } },
    });
    if (!connection) throw new ApiError(404, "This gateway is not connected");

    const result = await resolvePaymentProvider(connection).testConnection();

    await prisma.paymentGatewayConnection.update({
      where: { id: connection.id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result.message,
        status: result.success ? "CONNECTED" : "ERROR",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
