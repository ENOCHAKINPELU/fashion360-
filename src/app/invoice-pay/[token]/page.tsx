import type { Metadata } from "next";
import { InvoicePayClient } from "@/features/invoices/components/customer/invoice-pay-client";

export const metadata: Metadata = {
  title: "Invoice Payment | Fashion360",
  description: "View your invoice and pay securely.",
};

// Public, token-gated route — deliberately outside src/app/(dashboard). The
// customer pays Fashion360's own platform Flutterwave account directly (see
// lib/payment-architecture.ts); this page only displays the invoice and
// hands off to that hosted checkout.
export default async function InvoicePayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--accent-soft),_var(--background)_55%)]">
      <InvoicePayClient token={token} />
    </div>
  );
}
