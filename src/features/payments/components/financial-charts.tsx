import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { paymentMethodOptions } from "@/lib/validations/invoice";
import { RevenueOverTimeChart } from "@/features/payments/components/charts/revenue-over-time-chart";
import { PaymentsOverTimeChart } from "@/features/payments/components/charts/payments-over-time-chart";
import { OutstandingBalancesChart } from "@/features/payments/components/charts/outstanding-balances-chart";
import { QuotationConversionRateChart } from "@/features/payments/components/charts/quotation-conversion-rate-chart";
import { PaymentMethodBreakdownChart } from "@/features/payments/components/charts/payment-method-breakdown-chart";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function FinancialCharts({ businessId, currency }: { businessId: string; currency: string }) {
  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [monthlyPayments, outstandingInvoices, quotationCounts, paymentsByMethod] = await Promise.all([
    Promise.all(
      monthBuckets.map(async ({ year, month }) => {
        const agg = await prisma.payment.aggregate({
          where: {
            businessId,
            status: "SUCCESSFUL",
            paidAt: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) },
          },
          _sum: { amount: true },
        });
        return { label: MONTH_LABELS[month], amount: agg._sum.amount ?? 0 };
      })
    ),
    prisma.invoice.findMany({
      where: { businessId, status: { notIn: ["VOID", "CANCELLED", "DRAFT"] }, balanceDue: { gt: 0 } },
      select: { balanceDue: true, dueDate: true },
    }),
    prisma.quotation.groupBy({ by: ["status"], where: { businessId }, _count: true }),
    prisma.payment.groupBy({ by: ["method"], where: { businessId, status: "SUCCESSFUL" }, _sum: { amount: true } }),
  ]);

  const revenueData = monthlyPayments.map((m) => ({ label: m.label, revenue: m.amount }));
  const paymentsData = monthlyPayments.map((m) => ({ label: m.label, amount: m.amount }));

  const buckets = { current: 0, "1-30 days": 0, "31-60 days": 0, "60+ days": 0 };
  for (const inv of outstandingInvoices) {
    const daysOverdue = inv.dueDate ? Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : -1;
    if (daysOverdue <= 0) buckets.current += inv.balanceDue;
    else if (daysOverdue <= 30) buckets["1-30 days"] += inv.balanceDue;
    else if (daysOverdue <= 60) buckets["31-60 days"] += inv.balanceDue;
    else buckets["60+ days"] += inv.balanceDue;
  }
  const outstandingData = Object.entries(buckets).map(([label, value]) => ({ label, value }));

  const converted = quotationCounts.filter((q) => q.status === "ACCEPTED" || q.status === "CONVERTED").reduce((s, q) => s + q._count, 0);
  const declined = quotationCounts.filter((q) => q.status === "DECLINED" || q.status === "EXPIRED").reduce((s, q) => s + q._count, 0);
  const pending = quotationCounts.filter((q) => q.status === "SENT" || q.status === "VIEWED").reduce((s, q) => s + q._count, 0);

  const methodLabels = Object.fromEntries(paymentMethodOptions.map((o) => [o.value, o.label]));
  const methodData = paymentsByMethod
    .map((row) => ({ label: methodLabels[row.method] ?? row.method, value: row._sum.amount ?? 0 }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueOverTimeChart data={revenueData} currency={currency} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Payments Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsOverTimeChart data={paymentsData} currency={currency} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Outstanding Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <OutstandingBalancesChart data={outstandingData} currency={currency} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Quotation Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <QuotationConversionRateChart converted={converted} declined={declined} pending={pending} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm xl:col-span-2">
        <CardHeader>
          <CardTitle>Payment Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethodBreakdownChart data={methodData} />
        </CardContent>
      </Card>
    </div>
  );
}
