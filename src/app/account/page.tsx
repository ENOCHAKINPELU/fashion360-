import Link from "next/link";
import { ShoppingBag, ChevronRight, Compass, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getLinkedCustomerRecords } from "@/lib/customer-linked-data";
import { computePassportCompletion } from "@/lib/fashion-passport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { ServiceRequestStatusBadge } from "@/features/discover/components/service-request-status-badge";
import { getCustomerActionItems } from "@/lib/action-center";
import { generateDesignerRecommendations } from "@/lib/recommendations";
import { StarRating } from "@/shared/components/star-rating";
import { formatCurrency } from "@/lib/utils";

// One-focus "personal assistant" home: a single hero card answers "what's
// happening / what's next" (the highest-priority real, live pending action
// — no separate "Pending Actions" list competing for attention), then a
// compact glance row, one merged activity feed (requests + orders, instead
// of two separate stacked cards), and recommendations. Previously 8
// same-weight cards in a row with no clear starting point.
export default async function AccountHomePage() {
  const session = await auth();
  const { profile } = await requireCustomerContext();
  const linked = await getLinkedCustomerRecords(profile.id);
  const linkedByCustomerId = new Map(linked.map((l) => [l.customerId, l]));
  const customerIds = linked.map((l) => l.customerId);

  const [
    passport,
    completion,
    recentOrders,
    orderCount,
    upcomingAppointmentCount,
    pendingRequestCount,
    phase4ActionItems,
    activeServiceRequests,
    favoriteBusinesses,
  ] = await Promise.all([
    prisma.fashionPassport.findUnique({ where: { customerProfileId: profile.id } }),
    computePassportCompletion(prisma, profile),
    customerIds.length
      ? prisma.order.findMany({
          where: { customerId: { in: customerIds }, isArchived: false },
          orderBy: { orderDate: "desc" },
          take: 3,
          include: { business: { select: { currency: true } } },
        })
      : Promise.resolve([]),
    customerIds.length ? prisma.order.count({ where: { customerId: { in: customerIds }, isArchived: false } }) : Promise.resolve(0),
    customerIds.length
      ? prisma.appointment.count({
          where: { customerId: { in: customerIds }, startTime: { gte: new Date() }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
        })
      : Promise.resolve(0),
    prisma.businessCustomerRelationship.count({ where: { customerProfileId: profile.id, status: "PENDING", initiatedBy: "BUSINESS" } }),
    getCustomerActionItems(prisma, profile.id),
    prisma.serviceRequest.findMany({
      where: { customerProfileId: profile.id, status: { in: ["SUBMITTED", "RECEIVED", "UNDER_REVIEW"] } },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { business: { select: { name: true } } },
    }),
    prisma.businessFavorite.findMany({
      where: { customerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { business: { select: { id: true, name: true, logoUrl: true, profile: { select: { username: true } } } } },
    }),
  ]);

  const designerRecs = await prisma.$transaction((tx) => generateDesignerRecommendations(tx, profile.id, { limit: 3 }), { timeout: 20000 });
  const recommendedBusinesses = designerRecs.length
    ? await prisma.business.findMany({
        where: { id: { in: designerRecs.map((r) => r.targetId) } },
        select: { id: true, name: true, logoUrl: true, rating: { select: { averageRating: true, totalReviews: true } } },
      })
    : [];
  const recommendedBusinessById = new Map(recommendedBusinesses.map((b) => [b.id, b]));

  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  // One combined, priority-ordered list — connection requests first (they
  // block a relationship existing at all), then everything real and
  // time-sensitive from the action center, then the gentlest nudge
  // (finishing your passport) last.
  const priorityActions = [
    ...(pendingRequestCount > 0
      ? [{ label: `${pendingRequestCount} business connection request${pendingRequestCount > 1 ? "s" : ""} waiting on you`, href: "/account/settings" }]
      : []),
    ...phase4ActionItems,
    ...(passport && passport.status !== "COMPLETE" ? completion.missingItems.slice(0, 1) : []),
  ];
  const topAction = priorityActions[0] ?? null;
  const moreActionsCount = Math.max(0, priorityActions.length - 1);

  // Merge requests + orders into one "what's moving" feed, newest first.
  const activityFeed = [
    ...activeServiceRequests.map((r) => ({
      key: `req-${r.id}`,
      href: `/account/requests/${r.id}`,
      title: r.business.name,
      subtitle: r.requestCode,
      when: r.updatedAt,
      badge: <ServiceRequestStatusBadge status={r.status} />,
    })),
    ...recentOrders.map((o) => ({
      key: `ord-${o.id}`,
      href: `/account/orders/${o.id}`,
      title: linkedByCustomerId.get(o.customerId)?.businessName ?? o.orderCode,
      subtitle: `${o.orderCode} · ${formatCurrency(o.totalValue, o.business.currency)}`,
      when: o.orderDate,
      badge: <OrderStatusBadge status={o.status} />,
    })),
  ]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s where things stand.</p>
      </div>

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
                    +{moreActionsCount} more thing{moreActionsCount > 1 ? "s" : ""} waiting on you
                  </p>
                )}
              </div>
            </div>
            <Button asChild className="w-full gap-1.5 sm:w-auto">
              <Link href={topAction.href}>
                Take care of it <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none bg-accent-soft shadow-sm">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-success">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">You&apos;re all caught up</p>
                <p className="text-sm text-muted-foreground">
                  {linked.length === 0 ? "Find a designer to start your first outfit." : "We'll let you know the moment something needs you."}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full gap-1.5 sm:w-auto">
              <Link href="/account/discover">
                Discover Designers <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* At a glance — three numbers, nothing more */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Link href="/account/orders" className="rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary/40 hover:bg-accent-soft sm:text-left">
          <p className="text-2xl font-semibold text-foreground">{orderCount}</p>
          <p className="text-xs text-muted-foreground">Orders</p>
        </Link>
        <Link href="/account/requests" className="rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary/40 hover:bg-accent-soft sm:text-left">
          <p className="text-2xl font-semibold text-foreground">{activeServiceRequests.length}</p>
          <p className="text-xs text-muted-foreground">Active Requests</p>
        </Link>
        <Link href="/account/appointments" className="rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary/40 hover:bg-accent-soft sm:text-left">
          <p className="text-2xl font-semibold text-foreground">{upcomingAppointmentCount}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </Link>
      </div>

      {/* One merged feed instead of separate Requests / Orders cards */}
      <Card className="border-none shadow-sm">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">What&apos;s Moving</p>
            {activityFeed.length > 0 && (
              <Link href="/account/orders" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>
          {activityFeed.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Nothing in motion yet"
              description="Request a service from a designer to get started — we'll track it here from quote to delivery."
              className="border-none py-8"
              action={
                <Button asChild size="sm">
                  <Link href="/account/discover">Find a Designer</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {activityFeed.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm transition hover:border-primary/40">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                    {item.badge}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Your circle: designers you work with + favorites, one row */}
      {(linked.length > 0 || favoriteBusinesses.length > 0) && (
        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Your Designers</p>
              <Link href="/account/discover" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Discover more <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {linked.map((rel) => (
                <span key={rel.businessId} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground">
                  {rel.businessName}
                </span>
              ))}
              {favoriteBusinesses
                .filter((f) => !linkedByCustomerId.has(f.businessId))
                .map((f) => (
                  <Link
                    key={f.businessId}
                    href={`/business/${f.business.profile?.username ?? f.business.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    {f.business.name}
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations — real personalization, kept lightweight */}
      {designerRecs.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Recommended For You</p>
              </div>
              <Link href="/account/for-you" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                See more <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <ul className="grid gap-2 sm:grid-cols-3">
              {designerRecs.map((r) => {
                const business = recommendedBusinessById.get(r.targetId);
                if (!business) return null;
                return (
                  <li key={r.id}>
                    <Link href={`/business/${business.id}`} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40">
                      {business.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={business.logoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-primary">{business.name.charAt(0)}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{business.name}</p>
                        {business.rating && business.rating.totalReviews > 0 && <StarRating value={business.rating.averageRating} size="sm" />}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
