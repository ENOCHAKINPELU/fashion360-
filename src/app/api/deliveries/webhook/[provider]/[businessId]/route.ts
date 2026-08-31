import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveLogisticsProvider } from "@/lib/logistics-providers";
import { recordDeliveryEvent } from "@/lib/delivery";
import { raiseSystemAlert } from "@/lib/admin-system-alerts";
import type { LogisticsProviderType } from "@prisma/client";

// Mirrors /api/payments/webhook/[provider]/[businessId] exactly — one URL
// per business+provider, signature verified before anything is trusted,
// every event durably logged (idempotent on [provider, providerEventId])
// before any business logic runs, and always a 200 once logged so the
// courier doesn't endlessly retry an event we've already recorded.
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string; businessId: string }> }) {
  const { provider: providerParam, businessId } = await params;
  const provider = providerParam.toUpperCase() as LogisticsProviderType;
  const rawBody = await req.text();

  const connection = await prisma.logisticsProviderConnection.findUnique({
    where: { businessId_provider: { businessId, provider } },
  });
  if (!connection) {
    return NextResponse.json({ error: "Unknown logistics connection" }, { status: 404 });
  }

  const providerInstance = resolveLogisticsProvider(connection);
  const signatureHeader = req.headers.get("x-webhook-signature") ?? req.headers.get("x-courier-signature");
  const signatureValid = providerInstance.verifyWebhookSignature(rawBody, signatureHeader);

  let parsed: ReturnType<typeof providerInstance.parseWebhookEvent> | null = null;
  try {
    parsed = providerInstance.parseWebhookEvent(rawBody);
  } catch {
    parsed = null;
  }

  if (!signatureValid || !parsed) {
    await prisma.deliveryWebhookEvent.create({
      data: {
        businessId,
        provider,
        providerEventId: parsed?.providerEventId ?? `invalid_${Date.now()}`,
        eventType: parsed?.type ?? null,
        trackingNumber: parsed?.trackingNumber ?? null,
        signatureValid,
        rawPayload: safeJson(rawBody),
        status: "FAILED",
        errorMessage: !signatureValid ? "Signature verification failed" : "Unable to parse webhook payload",
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ received: true }, { status: signatureValid ? 400 : 401 });
  }

  const existingEvent = await prisma.deliveryWebhookEvent.findUnique({
    where: { provider_providerEventId: { provider, providerEventId: parsed.providerEventId } },
  });
  if (existingEvent) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  const webhookEvent = await prisma.deliveryWebhookEvent.create({
    data: {
      businessId,
      provider,
      providerEventId: parsed.providerEventId,
      eventType: parsed.type,
      trackingNumber: parsed.trackingNumber,
      signatureValid,
      rawPayload: safeJson(rawBody),
      status: "RECEIVED",
    },
  });

  try {
    const delivery = parsed.trackingNumber ? await prisma.delivery.findFirst({ where: { businessId, trackingNumber: parsed.trackingNumber } }) : null;

    if (delivery && parsed.status) {
      await prisma.$transaction((tx) =>
        recordDeliveryEvent(tx, {
          deliveryId: delivery.id,
          businessId,
          type: parsed!.type ?? "STATUS_UPDATE",
          status: parsed!.status!,
          description: parsed!.description,
          location: parsed!.location,
          actorType: "SYSTEM",
        })
      );
      await prisma.deliveryWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "PROCESSED", processedAt: new Date(), deliveryId: delivery.id },
      });
    } else {
      await prisma.deliveryWebhookEvent.update({ where: { id: webhookEvent.id }, data: { status: "IGNORED", processedAt: new Date() } });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await prisma.deliveryWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "FAILED", processedAt: new Date(), errorMessage },
    });
    await raiseSystemAlert(prisma, {
      category: "COURIER_FAILURE",
      title: "Courier webhook processing failed",
      message: `${provider} webhook for business ${businessId} failed to process: ${errorMessage}`,
      context: { provider, businessId, webhookEventId: webhookEvent.id },
    });
  }

  return NextResponse.json({ received: true });
}

function safeJson(rawBody: string) {
  try {
    return JSON.parse(rawBody);
  } catch {
    return { raw: rawBody };
  }
}
