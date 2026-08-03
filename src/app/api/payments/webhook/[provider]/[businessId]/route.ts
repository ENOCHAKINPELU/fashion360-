import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePaymentProvider } from "@/lib/payment-providers";
import { finalizePendingPayment } from "@/lib/payment-recording";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import type { PaymentProviderType } from "@prisma/client";

// Public webhook endpoint — one URL per business+provider (rather than one
// shared URL per provider) so the business's own webhook secret can be used
// to verify the signature *before* anything in the payload is trusted.
// Businesses configure this exact URL in their gateway dashboard; the
// gateway settings UI (payment-gateway) shows it to them.
//
// Always returns 200 once the event has been durably logged, even on
// business-logic failures below, so the provider doesn't endlessly retry a
// webhook we've already recorded — the PaymentWebhookEvent row is the audit
// trail for anything that still needs manual follow-up.
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string; businessId: string }> }) {
  const { provider: providerParam, businessId } = await params;
  const provider = providerParam.toUpperCase() as PaymentProviderType;

  // Generous ceiling — legitimate providers can burst-deliver retries — this
  // exists to blunt abuse of a guessed/leaked webhook URL, not to throttle
  // normal traffic. Signature verification (below) is the real gate.
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`webhook:${provider}:${businessId}:${ip}`, 120, 5 * 60 * 1000);
  if (!allowed) return NextResponse.json({ received: true }, { status: 429 });

  const rawBody = await req.text();

  const connection = await prisma.paymentGatewayConnection.findUnique({
    where: { businessId_provider: { businessId, provider } },
  });
  if (!connection) {
    return NextResponse.json({ error: "Unknown gateway connection" }, { status: 404 });
  }

  const providerInstance = resolvePaymentProvider(connection);
  const signatureHeader =
    req.headers.get("x-paystack-signature") ?? req.headers.get("verif-hash") ?? req.headers.get("stripe-signature");
  const signatureValid = providerInstance.verifyWebhookSignature(rawBody, signatureHeader);

  let parsed: ReturnType<typeof providerInstance.parseWebhookEvent> | null = null;
  try {
    parsed = providerInstance.parseWebhookEvent(rawBody);
  } catch {
    parsed = null;
  }

  if (!signatureValid || !parsed) {
    await prisma.paymentWebhookEvent.create({
      data: {
        businessId,
        provider,
        providerEventId: parsed?.providerEventId ?? `invalid_${Date.now()}`,
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

  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: { provider_providerEventId: { provider, providerEventId: parsed.providerEventId } },
  });
  if (existingEvent) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  const webhookEvent = await prisma.paymentWebhookEvent.create({
    data: {
      businessId,
      provider,
      providerEventId: parsed.providerEventId,
      eventType: parsed.type,
      providerReference: parsed.reference,
      signatureValid,
      rawPayload: safeJson(rawBody),
      status: "RECEIVED",
    },
  });

  try {
    if (parsed.reference && (parsed.status === "SUCCESSFUL" || parsed.status === "FAILED" || parsed.status === "REVERSED")) {
      // Never trust the webhook payload's own amount/status as final —
      // independently re-confirm with the provider's own verify API first
      // (Paystack's and Flutterwave's own docs recommend this even after a
      // valid webhook signature, since a webhook only proves the event came
      // from the provider, not that its body wasn't stale or partial).
      let verifiedAmount: number | null = null;
      let verifiedCurrency: string | null = null;
      let finalStatus: "SUCCESSFUL" | "FAILED" | "REVERSED" = parsed.status;
      if (parsed.status === "SUCCESSFUL") {
        try {
          const verified = await providerInstance.verifyPayment(parsed.reference);
          verifiedAmount = verified.amount;
          verifiedCurrency = verified.currency;
          finalStatus = verified.status === "SUCCESSFUL" ? "SUCCESSFUL" : "FAILED";
        } catch {
          // Provider verify call failed (network/provider error) — do not
          // trust the webhook body alone for a SUCCESSFUL status; leave the
          // payment PENDING so a retry (webhook redelivery or manual status
          // check) can confirm it properly instead of unlocking production
          // off an unverified claim.
          await prisma.paymentWebhookEvent.update({
            where: { id: webhookEvent.id },
            data: { status: "FAILED", processedAt: new Date(), errorMessage: "Provider verify call failed, payment left PENDING for retry" },
          });
          return NextResponse.json({ received: true, verifyFailed: true });
        }
      }

      const { payment } = await prisma.$transaction((tx) =>
        finalizePendingPayment(tx, {
          businessId,
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
