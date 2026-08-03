import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarClock,
  FileText,
  ThumbsUp,
  Hourglass,
  ThumbsDown,
  Receipt,
  BadgeCheck,
  Percent,
  FileWarning,
  RotateCcw,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { formatCurrency } from "@/lib/utils";

export async function FinancialDashboardStats({ businessId, currency }: { businessId: string; currency: string }) {
  const now = new Date();

  const [
    revenueAgg,
    outstandingAgg,
    overdueCount,
    totalQuotations,
    acceptedQuotations,
    pendingQuotations,
    declinedQuotations,
    totalInvoices,
    paidInvoices,
    partiallyPaidInvoices,
    unpaidInvoices,
    refundAgg,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: { businessId, status: "SUCCESSFUL" }, _sum: { amount: true } }),
    prisma.invoice.aggregate({
      where: { businessId, status: { notIn: ["VOID", "CANCELLED", "DRAFT"] } },
      _sum: { balanceDue: true },
    }),
    prisma.invoice.count({ where: { businessId, dueDate: { lt: now }, status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] } } }),
    prisma.quotation.count({ where: { businessId } }),
    prisma.quotation.count({ where: { businessId, status: { in: ["ACCEPTED", "CONVERTED"] } } }),
    prisma.quotation.count({ where: { businessId, status: { in: ["SENT", "VIEWED"] } } }),
    prisma.quotation.count({ where: { businessId, status: "DECLINED" } }),
    prisma.invoice.count({ where: { businessId } }),
    prisma.invoice.count({ where: { businessId, status: "PAID" } }),
    prisma.invoice.count({ where: { businessId, status: "PARTIALLY_PAID" } }),
    prisma.invoice.count({ where: { businessId, status: { in: ["SENT", "VIEWED", "OVERDUE"] } } }),
    prisma.refund.aggregate({ where: { businessId, status: "SUCCESSFUL" }, _sum: { amount: true } }),
  ]);

  const paidAmount = revenueAgg._sum.amount ?? 0;
  const outstandingBalance = outstandingAgg._sum.balanceDue ?? 0;
  const refunds = refundAgg._sum.amount ?? 0;
  const totalRevenue = paidAmount - refunds;

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue, currency), icon: Wallet },
    { label: "Paid Amount", value: formatCurrency(paidAmount, currency), icon: CheckCircle2 },
    { label: "Outstanding Balance", value: formatCurrency(outstandingBalance, currency), icon: Clock },
    { label: "Overdue Payments", value: String(overdueCount), icon: AlertTriangle },
    { label: "Total Quotations", value: String(totalQuotations), icon: FileText },
    { label: "Accepted Quotations", value: String(acceptedQuotations), icon: ThumbsUp },
    { label: "Pending Quotations", value: String(pendingQuotations), icon: Hourglass },
    { label: "Declined Quotations", value: String(declinedQuotations), icon: ThumbsDown },
    { label: "Total Invoices", value: String(totalInvoices), icon: Receipt },
    { label: "Paid Invoices", value: String(paidInvoices), icon: BadgeCheck },
    { label: "Partially Paid Invoices", value: String(partiallyPaidInvoices), icon: Percent },
    { label: "Unpaid Invoices", value: String(unpaidInvoices), icon: FileWarning },
    { label: "Pending Payments", value: String(pendingQuotations + unpaidInvoices), icon: CalendarClock },
    { label: "Refunds", value: formatCurrency(refunds, currency), icon: RotateCcw },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
      ))}
    </div>
  );
}
