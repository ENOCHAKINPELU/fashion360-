import type { Metadata } from "next";
import { QuotationReviewClient } from "@/features/quotations/components/customer/quotation-review-client";

export const metadata: Metadata = {
  title: "Quotation Review | Fashion360",
  description: "Review your quotation, ask questions, and accept or decline.",
};

// Public, token-gated route — deliberately outside src/app/(dashboard), so it
// never inherits the authenticated sidebar/topbar chrome. All real data comes
// from the public /api/quotation-share/[token] bundle, fetched client-side.
export default async function QuotationReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--accent-soft),_var(--background)_55%)]">
      <QuotationReviewClient token={token} />
    </div>
  );
}
