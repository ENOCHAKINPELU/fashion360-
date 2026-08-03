import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuotationWizard } from "@/features/quotations/components/quotation-wizard";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { currency: true } });

  return (
    <div className="space-y-6">
      <Link href="/dashboard/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to quotations
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create Quotation</h1>
        <p className="text-sm text-muted-foreground">Build a professional quotation to send to your customer.</p>
      </div>

      <QuotationWizard initialOrderId={params.orderId} currency={business.currency} />
    </div>
  );
}
