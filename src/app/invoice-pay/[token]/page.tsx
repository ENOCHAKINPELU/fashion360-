import type { Metadata } from "next";
import { InvoicePayClient } from "@/features/invoices/components/customer/invoice-pay-client";

export const metadata: Metadata = {
  title: "Invoice Payment | Fashion360",
  description: "View your invoice and pay securely through your business's connected payment gateway.",
};

// Public, token-gated route — deliberately outside src/app/(dashboard). The
// customer pays the business's own connected gateway directly (section 19 —
// Fashion360 never holds or routes the funds); this page only displays the
// invoice and hands off to that gateway's hosted checkout.
export default async function InvoicePayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--accent-soft),_var(--background)_55%)]">
      <InvoicePayClient token={token} />
    </div>
  );
}
