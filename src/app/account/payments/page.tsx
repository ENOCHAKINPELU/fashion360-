import { CreditCard } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getLinkedCustomerRecords } from "@/lib/customer-linked-data";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CustomerPaymentsPage() {
  await auth();
  const { profile } = await requireCustomerContext();
  const linked = await getLinkedCustomerRecords(profile.id);

  const emptyState = (
    <EmptyState icon={CreditCard} title="No Invoices Yet" description="Invoices and payment history from businesses you work with will appear here." />
  );

  if (linked.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payments</h1>
        {emptyState}
      </div>
    );
  }

  const linkedByCustomerId = new Map(linked.map((l) => [l.customerId, l]));
  const invoices = await prisma.invoice.findMany({
    where: { customerId: { in: linked.map((l) => l.customerId) } },
    orderBy: { issueDate: "desc" },
  });

  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const currency = invoices[0]?.currency ?? "NGN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">Invoices and payment history across every business you work with.</p>
      </div>

      {invoices.length === 0 ? (
        emptyState
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-xl font-semibold text-success">{formatCurrency(totalPaid, currency)}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="space-y-1">
                <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                <p className="text-xl font-semibold text-foreground">{formatCurrency(totalOutstanding, currency)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {invoices.map((invoice) => {
              const business = linkedByCustomerId.get(invoice.customerId);
              return (
                <Card key={invoice.id} className="border-none shadow-sm">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {business?.businessName} · {formatDate(invoice.issueDate)}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={invoice.status} />
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{formatCurrency(invoice.total, invoice.currency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.balanceDue > 0 ? `${formatCurrency(invoice.balanceDue, invoice.currency)} due` : "Paid in full"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
