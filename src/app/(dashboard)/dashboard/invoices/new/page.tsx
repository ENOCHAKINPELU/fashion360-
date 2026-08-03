import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoiceCreateForm } from "@/features/invoices/components/invoice-create-form";

export default async function NewInvoicePage({
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
      <Link href="/dashboard/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to invoices
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create Invoice</h1>
        <p className="text-sm text-muted-foreground">Generate a professional invoice for an order.</p>
      </div>

      <InvoiceCreateForm initialOrderId={params.orderId} currency={business.currency} />
    </div>
  );
}
