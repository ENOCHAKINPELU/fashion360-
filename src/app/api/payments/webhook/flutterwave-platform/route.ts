import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PlatformFlutterwaveProvider } from "@/lib/payment-providers/platform-flutterwave-provider";
import { finalizePendingPayment } from "@/lib/payment-recording";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Platform-level webhook — ONE url for every business, unlike
// .../webhook/[provider]/[businessId] (the OLD per-business-gateway
// webhook, still live for whatever legacy PaymentGatewayConnection may
// exist, but no longer how a business ends up getting paid — see
// lib/payment-link.ts). Charges here are collected into Fashion360's own
// platform Flutterwave account, so there's no businessId in the URL to key
// signature verification off; it's resolved afterward from the matching
// Payment row instead.
//
// Register this exact URL, plus a secret hash of your choosing, under
// Settings -> Webhooks in the Flutterwave dashboard — there is no API for
// this, only the dashboard (confirmed against the docs). That secret hash
// must also be set as FLUTTERWAVE_WEBHOOK_SECRET here.
//
// Always returns 200 once the event has been durably logged, even on
// business-logic failures below, so Flutterwave doesn't endlessly retry a
// webhook already recorded — PaymentWebhookEvent is the audit trail for
// anything that still needs manual follow-up. This is a second, durable
// path alongside lib/payment-link.ts's pollFlutterwaveChargeStatus, which
// actively checks on every relevant page load rather than waiting for this.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`webhook:flutterwave-platform:${ip}`, 120, 5 * 60 * 1000);
  if (!allowed) return NextResponse.json({ received: true }, { status: 429 });

  const rawBody = await req.text();
  const provider = new PlatformFlutterwaveProvider();
  const signatureHeader = req.headers.get("flutterwave-signature");
  const signatureValid = provider.verifyWebhookSignature(rawBody, signatureHeader);

  let parsed: ReturnType<typeof provider.parseWebhookEvent> | null = null;
  try {
    parsed = provider.parseWebhookEvent(rawBody);
  } catch {
    parsed = null;
  }

  const matchedPayment = parsed?.reference ? await prisma.payment.findFirst({ where: { providerReference: parsed.reference } }) : null;

  // Dedupe check moved ahead of the signature-invalid branch below: a
  // replay of an event id already logged — whether its signature is valid
  // this time or not — must short-circuit to the idempotent response
  // immediately. Previously this check only ran after a valid-signature
  // event, so replaying an *invalid*-signature event a second time hit
  // PaymentWebhookEvent's `@@unique([provider, providerEventId])`
  // constraint on the create() below and crashed with an uncaught 500
  // instead of the intended 401/400 — found by this exact replay scenario
  // during the V1 audit.
  if (parsed) {
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_providerEventId: { provider: "FLUTTERWAVE", providerEventId: parsed.providerEventId } },
    });
    if (existingEvent) {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }
  }

  if (!signatureValid || !parsed) {
    await prisma.paymentWebhookEvent.create({
      data: {
        businessId: matchedPayment?.businessId,
        provider: "FLUTTERWAVE",
        providerEventId: parsed?.providerEventId || `invalid_${Date.now()}`,
        eventType: parsed?.type ?? null,
        providerReference: parsed?.reference ?? null,
        signatureValid,
        rawPayload: safeJson(rawBody),
        status: "FAILED",
        errorMessage: !signatureValid ? "Signature verification failed" : "Unable to parse webhook payload",
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ received: true }, { status: signatureValid ? 400 : 401 });
  }

  const webhookEvent = await prisma.paymentWebhookEvent.create({
    data: {
      businessId: matchedPayment?.businessId,
      provider: "FLUTTERWAVE",
      providerEventId: parsed.providerEventId,
      eventType: parsed.type,
      providerReference: parsed.reference,
      signatureValid,
      rawPayload: safeJson(rawBody),
      status: "RECEIVED",
    },
  });

  if (!matchedPayment) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "IGNORED", processedAt: new Date(), errorMessage: "No matching Payment found for this charge reference" },
    });
    return NextResponse.json({ received: true });
  }

  try {
    if (parsed.reference && (parsed.status === "SUCCESSFUL" || parsed.status === "FAILED")) {
      // Never trust the webhook payload's own status as final — independently
      // re-confirm with GET /charges/{id} first, same defensive pattern as
      // the legacy per-business webhook route.
      let verifiedAmount: number | null = null;
      let verifiedCurrency: string | null = null;
      let finalStatus: "SUCCESSFUL" | "FAILED" = parsed.status;
      if (parsed.status === "SUCCESSFUL") {
        try {
          const verified = await provider.verifyPayment(parsed.reference);
          verifiedAmount = verified.amount;
          verifiedCurrency = verified.currency;
          finalStatus = verified.status === "SUCCESSFUL" ? "SUCCESSFUL" : "FAILED";
        } catch {
          await prisma.paymentWebhookEvent.update({
            where: { id: webhookEvent.id },
            data: { status: "FAILED", processedAt: new Date(), errorMessage: "Provider verify call failed, payment left PENDING for retry" },
          });
          return NextResponse.json({ received: true, verifyFailed: true });
        }
      }

      const { payment } = await prisma.$transaction((tx) =>
        finalizePendingPayment(tx, {
          businessId: matchedPayment.businessId,
          providerReference: parsed!.reference!,
          status: finalStatus,
          verifiedAmount,
          verifiedCurrency,
          actorType: "SYSTEM",
        })
      );
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "PROCESSED", processedAt: new Date(), paymentId: payment?.id },
      });
    } else {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "IGNORED", processedAt: new Date() },
      });
    }
  } catch (error) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "FAILED", processedAt: new Date(), errorMessage: error instanceof Error ? error.message : "Unknown error" },
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
