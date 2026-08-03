import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessPermission } from "@/lib/rbac";
import { gatewayConnectSchema } from "@/lib/validations/payment-gateway";
import { encryptSecret } from "@/lib/encryption";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import type { PaymentProviderType } from "@prisma/client";

function parseProvider(value: string): PaymentProviderType {
  const upper = value.toUpperCase();
  if (upper !== "PAYSTACK" && upper !== "FLUTTERWAVE" && upper !== "STRIPE") {
    throw new ApiError(400, "Unsupported payment provider");
  }
  return upper;
}

// Connecting a provider deactivates every other connection for this business
// — Fashion360 only ever routes a payment link through a single active
// gateway at a time (section 18). The business's own secret key is
// encrypted at rest and never echoed back in plaintext (implementation
// rules 10-11).
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { businessId, session } = await requireBusinessPermission("MANAGE_PAYMENTS");
    const { provider: providerParam } = await params;
    const provider = parseProvider(providerParam);

    const data = gatewayConnectSchema.parse(await req.json());
    if (data.provider !== provider) throw new ApiError(400, "Provider mismatch");

    const connection = await prisma.$transaction(async (tx) => {
      await tx.paymentGatewayConnection.updateMany({
        where: { businessId, NOT: { provider } },
        data: { isActive: false },
      });

      const result = await tx.paymentGatewayConnection.upsert({
        where: { businessId_provider: { businessId, provider } },
        create: {
          businessId,
          provider,
          publicKey: data.publicKey || null,
          secretKeyEncrypted: encryptSecret(data.secretKey),
          webhookSecretEncrypted: data.webhookSecret ? encryptSecret(data.webhookSecret) : null,
          currency: data.currency.toUpperCase(),
          status: "CONNECTED",
          isActive: true,
          connectedById: session.user.id,
          connectedAt: new Date(),
        },
        update: {
          publicKey: data.publicKey || null,
          secretKeyEncrypted: encryptSecret(data.secretKey),
          webhookSecretEncrypted: data.webhookSecret ? encryptSecret(data.webhookSecret) : undefined,
          currency: data.currency.toUpperCase(),
          status: "CONNECTED",
          isActive: true,
          connectedById: session.user.id,
          connectedAt: new Date(),
          disconnectedAt: null,
        },
      });

      await logFinancialTransaction(tx, {
        businessId,
        type: "GATEWAY_CONNECTED",
        description: `${provider} payment gateway connected`,
        actorType: "STAFF",
        actorId: session.user.id,
      });

      return result;
    });

    return NextResponse.json({ connected: true, provider: connection.provider, status: connection.status });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { businessId, session } = await requireBusinessPermission("MANAGE_PAYMENTS");
    const { provider: providerParam } = await params;
    const provider = parseProvider(providerParam);

    const existing = await prisma.paymentGatewayConnection.findUnique({
      where: { businessId_provider: { businessId, provider } },
    });
    if (!existing) throw new ApiError(404, "This gateway is not connected");

    await prisma.$transaction(async (tx) => {
      await tx.paymentGatewayConnection.update({
        where: { id: existing.id },
        data: { status: "DISCONNECTED", isActive: false, disconnectedAt: new Date() },
      });
      await logFinancialTransaction(tx, {
        businessId,
        type: "GATEWAY_DISCONNECTED",
        description: `${provider} payment gateway disconnected`,
        actorType: "STAFF",
        actorId: session.user.id,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
