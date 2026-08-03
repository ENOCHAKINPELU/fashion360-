import type { Metadata } from "next";
import { CustomerReviewClient } from "@/features/design-studio/components/customer-review/customer-review-client";

export const metadata: Metadata = {
  title: "Design Review | Fashion360",
  description: "Review your design, leave feedback, and approve it for production.",
};

// Public, token-gated route — deliberately outside src/app/(dashboard), so it
// never inherits the authenticated sidebar/topbar chrome. All real data comes
// from the public /api/design-share/[token] bundle, fetched client-side by
// CustomerReviewClient (exactly once per load — see the ref guard there).
export default async function DesignReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--accent-soft),_var(--background)_55%)]">
      <CustomerReviewClient token={token} />
    </div>
  );
}
