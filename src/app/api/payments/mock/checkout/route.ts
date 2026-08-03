import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizePendingPayment } from "@/lib/payment-recording";

// The Mock provider's "hosted checkout" — see mock-provider.ts. Settles the
// pending payment immediately and redirects back, simulating what a real
// gateway's checkout + webhook round-trip accomplishes, without leaving the
// app or needing real credentials. Never reachable in a flow using a real
// connected gateway (MockProvider is only ever selected for the MOCK
// provider type).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const providerReference = params.get("providerReference");
  const reference = params.get("reference");
  const callbackUrl = params.get("callbackUrl");

  if (!providerReference || !callbackUrl) {
    return NextResponse.json({ error: "Missing reference or callback URL" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({ where: { providerReference } });
  if (payment) {
    await prisma.$transaction((tx) =>
      finalizePendingPayment(tx, {
        businessId: payment.businessId,
        providerReference,
        status: "SUCCESSFUL",
        actorType: "SYSTEM",
      })
    );
  }

  // Mirrors a real provider's redirect (Paystack appends ?reference=&trxref=)
  // so the post-payment confirmation screen triggers identically in dev/demo.
  const redirectUrl = new URL(callbackUrl);
  if (reference) redirectUrl.searchParams.set("reference", reference);
  return NextResponse.redirect(redirectUrl.toString());
}
