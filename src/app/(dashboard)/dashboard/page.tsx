import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, Wallet, CalendarClock, ImageIcon, ExternalLink, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { SampleBadge } from "@/features/dashboard/components/sample-badge";
import { RevenueChart } from "@/features/dashboard/components/revenue-chart";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { UpcomingTasks } from "@/features/dashboard/components/upcoming-tasks";
import { RecentCustomers } from "@/features/dashboard/components/recent-customers";
import { LatestOrders } from "@/features/dashboard/components/latest-orders";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { CustomerRequestsPanel } from "@/features/business/components/customer-requests-panel";
import { BusinessCompletionBanner } from "@/features/business/components/business-completion-banner";
import { BusinessTrustProfileCard } from "@/features/business/components/business-trust-profile-card";
import { computeBusinessProfileCompletion } from "@/lib/business-profile-completion";
import { getBusinessTrustProfile } from "@/lib/business-trust-profile";
import { getBusinessResponseMetrics } from "@/lib/business-response-metrics";
import { getBusinessActionItems } from "@/lib/action-center";
import { EmptyState } from "@/shared/components/empty-state";

export default async function DashboardPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const [
    business,
    connectionRequests,
    completion,
    trust,
    connectedCustomerCount,
    portfolioItems,
    responseMetrics,
    serviceRequestCounts,
    actionItems,
    totalCustomerCount,
    activeOrderCount,
    revenueAgg,
    upcomingAppointmentCount,
    businessProfile,
  ] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.businessCustomerRelationship.findMany({
        where: { businessId, status: "PENDING", initiatedBy: "CUSTOMER" },
        orderBy: { requestedAt: "desc" },
        include: { customerProfile: { include: { user: { select: { name: true, email: true, image: true } } } } },
      }),
      computeBusinessProfileCompletion(prisma, businessId),
      getBusinessTrustProfile(prisma, businessId),
      prisma.businessCustomerRelationship.count({ where: { businessId, status: "ACTIVE" } }),
      prisma.businessPortfolioItem.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" }, take: 4 }),
      getBusinessResponseMetrics(prisma, businessId),
      prisma.serviceRequest.groupBy({ by: ["status"], where: { businessId }, _count: true }),
      getBusinessActionItems(prisma, businessId),
      prisma.customer.count({ where: { businessId } }),
      prisma.order.count({ where: { businessId, status: { notIn: ["DRAFT", "COMPLETED", "DELIVERED", "CANCELLED"] } } }),
      prisma.order.aggregate({ where: { businessId }, _sum: { amountPaid: true } }),
      prisma.appointment.count({
        where: { businessId, startTime: { gte: new Date() }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      }),
      prisma.businessProfile.findUnique({ where: { businessId } }),
    ]);
  const profileHandle = businessProfile?.username ?? businessId;

  const countFor = (statuses: string[]) =>
    serviceRequestCounts.filter((c) => statuses.includes(c.status)).reduce((sum, c) => sum + c._count, 0);
  const newRequestCount = countFor(["SUBMITTED"]);
  const pendingRequestCount = countFor(["RECEIVED", "UNDER_REVIEW"]);
  const acceptedRequestCount = countFor(["ACCEPTED"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back{business ? `, ${business.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s an overview of your business today.</p>
      </div>

      <BusinessCompletionBanner completionPercent={completion.completionPercent} missingItems={completion.missingItems} />

      {actionItems.length > 0 && (
        <Card className="border-none bg-accent-soft shadow-sm">
          <CardContent>
            <p className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">Action Center: What Needs Your Attention</p>
            <ul className="flex flex-wrap gap-2">
              {actionItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center rounded-full border border-primary/20 bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <BusinessTrustProfileCard
          isVerified={trust.isVerified}
          completedOrders={trust.completedOrders}
          averageRating={trust.averageRating}
          reviewCount={trust.reviewCount}
        />

        <Card className="border-none shadow-sm">
          <CardContent className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Public Profile</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{connectedCustomerCount}</p>
              <p className="text-xs text-muted-foreground">Connected Customers</p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-fit gap-1.5">
              <Link href={`/business/${profileHandle}`} target="_blank">
                View Public Profile <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Portfolio</p>
            {portfolioItems.length === 0 ? (
              <EmptyState icon={ImageIcon} title="No Portfolio Items" description="Add work in Settings to showcase it here." className="border-none py-6" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {portfolioItems.map((item) => (
                  <div key={item.id} className="aspect-square overflow-hidden rounded-xl bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.title} className="size-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Service Requests</CardTitle>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/dashboard/service-requests">
              <Inbox className="size-3.5" /> View All
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <p className="text-2xl font-semibold text-foreground">{newRequestCount}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{pendingRequestCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{acceptedRequestCount}</p>
              <p className="text-xs text-muted-foreground">Accepted</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{responseMetrics.responseRate == null ? "N/A" : `${responseMetrics.responseRate}%`}</p>
              <p className="text-xs text-muted-foreground">Response Rate</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {responseMetrics.avgResponseTimeHours == null ? "N/A" : `~${responseMetrics.avgResponseTimeHours}h`}
              </p>
              <p className="text-xs text-muted-foreground">Response Time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={String(totalCustomerCount)} icon={Users} />
        <StatCard label="Active Orders" value={String(activeOrderCount)} icon={ShoppingBag} />
        <StatCard label="Revenue" value={`₦${(revenueAgg._sum.amountPaid ?? 0).toLocaleString()}`} icon={Wallet} />
        <StatCard label="Upcoming Appointments" value={String(upcomingAppointmentCount)} icon={CalendarClock} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-sm font-medium text-foreground">Profile Views</p>
            <p className="text-xs text-muted-foreground">Not tracked yet</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="text-sm font-medium text-foreground">Portfolio Views</p>
            <p className="text-xs text-muted-foreground">Not tracked yet</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue</CardTitle>
            <SampleBadge />
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity businessId={businessId} userId={session!.user.id} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Tasks</CardTitle>
            <SampleBadge />
          </CardHeader>
          <CardContent>
            <UpcomingTasks />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Customers</CardTitle>
            <SampleBadge />
          </CardHeader>
          <CardContent>
            <RecentCustomers />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customer Requests</CardTitle>
          {connectionRequests.length > 0 && <span className="text-xs font-medium text-primary">{connectionRequests.length} pending</span>}
        </CardHeader>
        <CardContent>
          <CustomerRequestsPanel
            requests={connectionRequests.map((r) => ({
              id: r.id,
              requestedAt: r.requestedAt.toISOString(),
              customerProfile: r.customerProfile,
            }))}
          />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest Orders</CardTitle>
          <SampleBadge />
        </CardHeader>
        <CardContent>
          <LatestOrders />
        </CardContent>
      </Card>
    </div>
  );
}
