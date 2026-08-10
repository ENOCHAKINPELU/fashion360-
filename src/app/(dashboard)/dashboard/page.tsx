import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, ArrowRight, CheckCircle2, Sparkles, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { CustomerRequestsPanel } from "@/features/business/components/customer-requests-panel";
import { BusinessCompletionBanner } from "@/features/business/components/business-completion-banner";
import { BusinessTrustProfileCard } from "@/features/business/components/business-trust-profile-card";
import { computeBusinessProfileCompletion } from "@/lib/business-profile-completion";
import { getBusinessTrustProfile } from "@/lib/business-trust-profile";
import { getBusinessActionItems } from "@/lib/action-center";
import { EmptyState } from "@/shared/components/empty-state";

// One-focus "personal assistant" home, mirroring the customer dashboard's
// redesign: a single hero answers "what needs me right now" (real, live
// data from action-center.ts — already computing a properly prioritized
// list, it just used to be buried as a small pill row under three other
// full cards). Previously 16 stacked content blocks, four of them showing
// hardcoded fake "Sample data" (a live business's dashboard showing made-up
// customers/orders/tasks is worse than showing nothing) plus two literal
// "Not tracked yet" cards — all removed rather than kept as decoration.
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
    actionItems,
    activeOrderCount,
    revenueAgg,
    newRequestCount,
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
      getBusinessActionItems(prisma, businessId),
      prisma.order.count({ where: { businessId, status: { notIn: ["DRAFT", "COMPLETED", "DELIVERED", "CANCELLED"] } } }),
      prisma.order.aggregate({ where: { businessId }, _sum: { amountPaid: true } }),
      prisma.serviceRequest.count({ where: { businessId, status: "SUBMITTED" } }),
      prisma.businessProfile.findUnique({ where: { businessId } }),
    ]);
  const profileHandle = businessProfile?.username ?? businessId;
  const topAction = actionItems[0] ?? null;
  const moreActionsCount = Math.max(0, actionItems.length - 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back{business ? `, ${business.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s where things stand today.</p>
      </div>

      <BusinessCompletionBanner completionPercent={completion.completionPercent} missingItems={completion.missingItems} />

      {/* Hero: the one thing that matters most right now */}
      {topAction ? (
        <Card className="border-none bg-accent-soft shadow-sm">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-primary uppercase">Needs your attention</p>
                <p className="mt-0.5 text-base font-medium text-foreground">{topAction.label}</p>
                {moreActionsCount > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    +{moreActionsCount} more thing{moreActionsCount > 1 ? "s" : ""} on your list
                  </p>
                )}
              </div>
            </div>
            <Button asChild className="w-full gap-1.5 sm:w-auto">
              <Link href={topAction.href}>
                Handle it <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none bg-accent-soft shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-base font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-sm text-muted-foreground">Nothing needs you right now — we&apos;ll notify you the moment something does.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* At a glance — three numbers that matter, nothing more */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Link href="/dashboard/service-requests?status=SUBMITTED" className="rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary/40 hover:bg-accent-soft sm:text-left">
          <p className="text-2xl font-semibold text-foreground">{newRequestCount}</p>
          <p className="text-xs text-muted-foreground">New Requests</p>
        </Link>
        <Link href="/dashboard/orders" className="rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary/40 hover:bg-accent-soft sm:text-left">
          <p className="text-2xl font-semibold text-foreground">{activeOrderCount}</p>
          <p className="text-xs text-muted-foreground">Active Orders</p>
        </Link>
        <Link href="/dashboard/payments" className="rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary/40 hover:bg-accent-soft sm:text-left">
          <p className="text-2xl font-semibold text-foreground">₦{(revenueAgg._sum.amountPaid ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </Link>
      </div>

      {/* Only shown when there's actually something to decide — no empty "0 requests" card */}
      {connectionRequests.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Customers Wanting to Connect</p>
              <span className="text-xs font-medium text-primary">{connectionRequests.length} pending</span>
            </div>
            <CustomerRequestsPanel
              requests={connectionRequests.map((r) => ({
                id: r.id,
                requestedAt: r.requestedAt.toISOString(),
                customerProfile: r.customerProfile,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-4 text-sm font-semibold text-foreground">Recent Activity</p>
            <RecentActivity businessId={businessId} userId={session!.user.id} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-4 text-sm font-semibold text-foreground">Quick Actions</p>
            <QuickActions />
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
