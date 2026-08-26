import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminDesignerActions } from "@/features/admin/components/admin-designer-actions";
import { AdminDesignerVerificationPanel } from "@/features/admin/components/admin-designer-verification-panel";
import { AdminPortfolioModeration } from "@/features/admin/components/admin-portfolio-moderation";
import { TrendAreaChart } from "@/features/admin/components/charts/trend-area-chart";
import {
  ShieldCheck,
  Ban,
  ShoppingBag,
  Users,
  Star,
  ArrowLeft,
  Wallet,
  Image as ImageIcon,
  History,
  AlertTriangle,
  Info,
  Banknote,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getDesignerActivityTimeline } from "@/lib/admin-designers";

const PORTFOLIO_STATUS_BADGE: Record<string, string> = {
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  UPDATE_REQUESTED: "bg-warning-soft text-warning",
};

function monthBuckets(count: number) {
  const now = new Date();
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const next = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i) + 1, 1);
    return { label: labels[d.getMonth()], start: d, end: next };
  });
}

export default async function AdminDesignerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      country: true,
      businessType: true,
      createdAt: true,
      workingHours: true,
      profile: { select: { description: true, serviceArea: true, website: true, yearsOfExperience: true } },
      specialties: { select: { name: true } },
      rating: { select: { averageRating: true, totalReviews: true } },
      verification: {
        select: {
          status: true,
          submissionNote: true,
          documentUrl: true,
          notes: true,
          submittedAt: true,
          reviewedAt: true,
          reviewedBy: { select: { name: true } },
        },
      },
      users: { where: { role: "OWNER" }, take: 1, select: { name: true, email: true } },
    },
  });

  if (!business) notFound();

  const sixMonthsAgo = monthBuckets(6)[0].start;

  const [orders, portfolioItems, reviews, payouts, disputes, activity, ordersByCustomer, monthlyPayments] = await Promise.all([
    prisma.order.findMany({
      where: { businessId: id },
      orderBy: { orderDate: "desc" },
      take: 30,
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentStatus: true,
        totalValue: true,
        orderDate: true,
        customerProfile: { select: { user: { select: { name: true } } } },
        delivery: { select: { status: true } },
      },
    }),
    prisma.businessPortfolioItem.findMany({ where: { businessId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.review.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, overallRating: true, bodyText: true, createdAt: true, flaggedAt: true, customerProfile: { select: { user: { select: { name: true } } } } },
    }),
    prisma.payout.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, netAmount: true, status: true, paidAt: true, providerReference: true },
    }),
    prisma.dispute.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        issueType: true,
        status: true,
        order: { select: { orderCode: true } },
        customerProfile: { select: { user: { select: { name: true } } } },
        resolution: { select: { resolutionType: true, resolvedBy: { select: { name: true } } } },
      },
    }),
    getDesignerActivityTimeline(id),
    prisma.order.groupBy({
      by: ["customerProfileId"],
      where: { businessId: id, customerProfileId: { not: null } },
      _count: true,
      _sum: { amountPaid: true },
    }),
    prisma.payment.findMany({ where: { businessId: id, status: "SUCCESSFUL", paidAt: { gte: sixMonthsAgo } }, select: { amount: true, paidAt: true } }),
  ]);

  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  const pendingBalance = payouts.filter((p) => p.status === "ELIGIBLE" || p.status === "PROCESSING").reduce((s, p) => s + p.netAmount, 0);
  const paidOut = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.netAmount, 0);

  const [payoutTotals, outstandingBalanceAgg] = await Promise.all([
    prisma.payout.aggregate({ where: { businessId: id }, _sum: { platformFee: true, orderAmount: true } }),
    prisma.order.aggregate({ where: { businessId: id }, _sum: { balanceDue: true } }),
  ]);
  const grossRevenue = payoutTotals._sum.orderAmount ?? 0;
  const platformFees = payoutTotals._sum.platformFee ?? 0;

  const customerProfileIds = ordersByCustomer.map((g) => g.customerProfileId).filter((v): v is string => !!v);
  const [customerProfiles, customerReviewCounts, customerCompletedCounts] = customerProfileIds.length
    ? await Promise.all([
        prisma.customerProfile.findMany({ where: { id: { in: customerProfileIds } }, select: { id: true, user: { select: { name: true } } } }),
        prisma.review.groupBy({ by: ["customerProfileId"], where: { businessId: id, customerProfileId: { in: customerProfileIds } }, _count: true }),
        prisma.order.groupBy({ by: ["customerProfileId"], where: { businessId: id, status: "COMPLETED", customerProfileId: { in: customerProfileIds } }, _count: true }),
      ])
    : [[], [], []];
  const reviewCountByCustomer = new Map(customerReviewCounts.map((g) => [g.customerProfileId, g._count]));
  const customerNameById = new Map(customerProfiles.map((c) => [c.id, c.user.name]));
  const completedCountByCustomer = new Map(customerCompletedCounts.map((g) => [g.customerProfileId, g._count]));

  const buckets = monthBuckets(6);
  const revenueTrend = buckets.map((b) => {
    const sum = monthlyPayments.filter((p) => p.paidAt! >= b.start && p.paidAt! < b.end).reduce((s, p) => s + p.amount, 0);
    return { label: b.label, value: sum };
  });

  const suspended = business.verification?.status === "SUSPENDED";
  const verification = business.verification;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/businesses" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to Designers
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {business.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="size-8 rounded-lg object-cover ring-1 ring-border" />
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{business.name}</h1>
            {suspended ? (
              <Badge className="gap-1 bg-danger-soft text-danger">
                <Ban className="size-3" /> Suspended
              </Badge>
            ) : (
              <Badge className="gap-1 bg-success-soft text-success">
                <ShieldCheck className="size-3" /> Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {business.users[0]?.name ?? "No owner on file"} · {business.users[0]?.email ?? business.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/requests?designerId=${business.id}`}>
            <Button size="default" variant="outline">
              View Requests
            </Button>
          </Link>
          <Link href={`/admin/orders?designerId=${business.id}`}>
            <Button size="default" variant="outline">
              View Orders
            </Button>
          </Link>
          <Link href={`/admin/payments?designerId=${business.id}`}>
            <Button size="default" variant="outline">
              View Payments
            </Button>
          </Link>
          <Link href={`/admin/deliveries?designerId=${business.id}`}>
            <Button size="default" variant="outline">
              View Deliveries
            </Button>
          </Link>
          <AdminDesignerActions businessId={business.id} suspended={suspended} size="default" />
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Registered</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(business.createdAt)}</p>
            <p className="text-xs text-muted-foreground">{[business.city, business.state, business.country].filter(Boolean).join(", ") || "No location on file"}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{orders.length}</p>
            <p className="text-xs text-muted-foreground">
              {completedOrders} completed · {cancelledOrders} cancelled
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Rating</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {business.rating && business.rating.totalReviews > 0 ? business.rating.averageRating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{business.rating?.totalReviews ?? 0} reviews</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Revenue Generated</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(grossRevenue, "NGN")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Information */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4" /> Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm text-foreground">{business.profile?.description ?? "No description provided"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Years of Experience</p>
            <p className="text-sm text-foreground">{business.profile?.yearsOfExperience ?? "Not specified"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Specializations</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {business.specialties.length === 0 ? (
                <span className="text-sm text-muted-foreground">None listed</span>
              ) : (
                business.specialties.map((s) => (
                  <Badge key={s.name} variant="outline">
                    {s.name}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Service Area</p>
            <p className="text-sm text-foreground">{business.profile?.serviceArea ?? "Not specified"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="text-sm text-foreground">{business.email ?? "—"}</p>
            <p className="text-sm text-foreground">{business.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Business Type</p>
            <p className="text-sm text-foreground">{business.businessType.replace(/_/g, " ")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Verification */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline">{verification?.status ?? "UNVERIFIED"}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profile Completion</p>
              <p className="text-sm text-foreground">
                {business.profile?.description && business.specialties.length > 0 ? "Complete" : "Incomplete"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Portfolio Completion</p>
              <p className="text-sm text-foreground">{portfolioItems.length > 0 ? `${portfolioItems.length} items uploaded` : "No portfolio yet"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Reviewed</p>
              <p className="text-sm text-foreground">
                {verification?.reviewedAt ? `${formatDate(verification.reviewedAt)} by ${verification.reviewedBy?.name ?? "an admin"}` : "Never reviewed"}
              </p>
            </div>
          </div>
          {verification?.submissionNote && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              <span className="text-xs text-muted-foreground">Business submitted: </span>
              {verification.submissionNote}
            </div>
          )}
          {verification?.notes && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              <span className="text-xs text-muted-foreground">Admin notes: </span>
              {verification.notes}
            </div>
          )}
          <AdminDesignerVerificationPanel businessId={business.id} status={verification?.status ?? "UNVERIFIED"} />
        </CardContent>
      </Card>

      {/* Portfolio */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4" /> Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {portfolioItems.length === 0 ? (
            <EmptyState icon={ImageIcon} title="No portfolio uploaded" className="border-none py-8" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.title} className="h-36 w-full object-cover" />
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <Badge className={PORTFOLIO_STATUS_BADGE[item.status] ?? "bg-muted text-muted-foreground"}>{item.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.category ?? "Uncategorized"} · {formatDate(item.createdAt)}
                    </p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    <AdminPortfolioModeration businessId={business.id} itemId={item.id} status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="size-4" /> Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders" className="border-none py-8" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Customer</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Payment</th>
                    <th className="py-2 font-medium">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-medium text-foreground">{o.orderCode}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{o.customerProfile?.user.name ?? "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{formatDate(o.orderDate)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(o.totalValue, "NGN")}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{o.paymentStatus.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{o.delivery?.status.replace(/_/g, " ") ?? "Not yet"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customers */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersByCustomer.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet" className="border-none py-8" />
          ) : (
            <div className="space-y-2">
              {ordersByCustomer.map((g) => (
                <div key={g.customerProfileId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Link href={`/admin/customers/${g.customerProfileId}`} className="font-medium text-foreground hover:underline">
                    {customerNameById.get(g.customerProfileId!) ?? "Unnamed customer"}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{completedCountByCustomer.get(g.customerProfileId) ?? 0} completed</span>
                    <span>{reviewCountByCustomer.get(g.customerProfileId!) ?? 0} reviews</span>
                    <span className="tabular-nums">{formatCurrency(g._sum.amountPaid ?? 0, "NGN")} lifetime</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-4" /> Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet" className="border-none py-8" />
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {r.customerProfile.user.name ?? "A customer"} · {r.overallRating}★
                    </p>
                    <div className="flex items-center gap-2">
                      {r.flaggedAt && (
                        <Badge className="gap-1 bg-danger-soft text-danger">
                          <AlertTriangle className="size-3" /> Flagged
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.bodyText}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-4" /> Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Gross Revenue</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(grossRevenue, "NGN")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Platform Fees</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(platformFees, "NGN")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Balance</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(pendingBalance, "NGN")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid Out</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(paidOut, "NGN")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding Balance</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(outstandingBalanceAgg._sum.balanceDue ?? 0, "NGN")}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Revenue Trend</p>
            <TrendAreaChart data={revenueTrend} kind="revenue" valueLabel="Revenue" currency="NGN" />
          </div>
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4" /> Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <EmptyState icon={Wallet} title="No payouts" className="border-none py-8" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2 pr-3 font-medium">Payout</th>
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">{p.id}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(p.netAmount, "NGN")}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{p.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                      <td className="py-2 font-mono text-[11px] text-muted-foreground">{p.providerReference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disputes */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" /> Disputes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No disputes" className="border-none py-8" />
          ) : (
            <div className="space-y-2">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {d.order.orderCode} · {d.customerProfile?.user.name ?? "A customer"}
                    </p>
                    <Badge variant="outline">{d.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.issueType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.resolution ? `Resolved (${d.resolution.resolutionType.replace(/_/g, " ")}) by ${d.resolution.resolvedBy?.name ?? "an admin"}` : "Unassigned"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" /> Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" className="border-none py-8" />
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="text-foreground">{item.description}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
