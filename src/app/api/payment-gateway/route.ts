import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { maskSecret, decryptSecret } from "@/lib/encryption";

// Never returns a decrypted secret to the client — only whether one is
// configured, plus a masked preview, so staff can confirm the right key is
// on file without the plaintext ever reaching the browser.
export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();

    const connections = await prisma.paymentGatewayConnection.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      include: { connectedBy: { select: { name: true } } },
    });

    return NextResponse.json({
      connections: connections.map((c) => ({
        id: c.id,
        provider: c.provider,
        publicKey: c.publicKey,
        secretKeyMasked: c.secretKeyEncrypted ? maskSecret(decryptSecret(c.secretKeyEncrypted)) : null,
        webhookConfigured: Boolean(c.webhookSecretEncrypted),
        currency: c.currency,
        status: c.status,
        isActive: c.isActive,
        lastTestedAt: c.lastTestedAt,
        lastTestResult: c.lastTestResult,
        connectedBy: c.connectedBy?.name ?? null,
        connectedAt: c.connectedAt,
        disconnectedAt: c.disconnectedAt,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
