import Link from "next/link";
import { ShoppingBag, Users, CalendarClock, ChevronRight, Shirt, ListChecks, Compass, BookUser, ClipboardList, Heart, Sparkles } from "lucide-react";
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
import { FashionPassportBanner } from "@/features/customer-account/components/fashion-passport-banner";
import { CustomerRecentActivity } from "@/features/customer-account/components/customer-recent-activity";
import { getCustomerActionItems } from "@/lib/action-center";
import { generateDesignerRecommendations } from "@/lib/recommendations";
import { StarRating } from "@/shared/components/star-rating";
import { formatCurrency, formatDate } from "@/lib/utils";

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
    wardrobeItemCount,
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
    prisma.customerWardrobeItem.count({ where: { customerProfileId: profile.id } }),
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
      take: 3,
      include: { business: { select: { id: true, name: true, logoUrl: true, profile: { select: { username: true } } } } },
    }),
  ]);

  const designerRecs = await prisma.$transaction((tx) => generateDesignerRecommendations(tx, profile.id, { limit: 4 }), { timeout: 20000 });
  const recommendedBusinesses = designerRecs.length
    ? await prisma.business.findMany({
        where: { id: { in: designerRecs.map((r) => r.targetId) } },
        select: { id: true, name: true, logoUrl: true, rating: { select: { averageRating: true, totalReviews: true } } },
      })
    : [];
  const recommendedBusinessById = new Map(recommendedBusinesses.map((b) => [b.id, b]));

  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  const pendingActions = [
    ...(pendingRequestCount > 0
      ? [{ label: `${pendingRequestCount} business connection request${pendingRequestCount > 1 ? "s" : ""} awaiting your response`, href: "/account/settings" }]
      : []),
    ...phase4ActionItems,
    ...completion.missingItems.slice(0, 3),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground">Your digital fashion journey, all in one place.</p>
      </div>

      {passport && passport.status !== "COMPLETE" && <FashionPassportBanner completionPercent={completion.completionPercent} />}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/account/passport">Complete Fashion Passport</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/account/discover">Discover Designers</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/account/discover">Connect with a Fashion Business</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{linked.length}</p>
              <p className="text-xs text-muted-foreground">Designer Relationships</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{orderCount}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{upcomingAppointmentCount}</p>
              <p className="text-xs text-muted-foreground">Upcoming Appointments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="size-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Pending Actions</p>
            </div>
            {pendingActions.length === 0 ? (
              <EmptyState icon={ListChecks} title="You're All Caught Up" description="No pending actions right now." className="border-none py-8" />
            ) : (
              <ul className="space-y-1.5">
                {pendingActions.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-accent-soft"
                    >
                      {item.label}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <BookUser className="size-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Recent Activity</p>
            </div>
            <CustomerRecentActivity userId={session!.user.id} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Your Designers</p>
            {linked.length > 0 && (
              <Link href="/account/discover" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Discover more <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>
          {linked.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No Designers Yet"
              description="Once you start working with a fashion business, they'll show up here."
            />
          ) : (
            <ul className="space-y-2">
              {linked.map((rel) => (
                <li key={rel.businessId} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                  <span className="font-medium text-foreground">{rel.businessName}</span>
                  <span className="text-xs text-muted-foreground">Active</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Active Requests</p>
            <Link href="/account/requests" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {activeServiceRequests.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No Service Requests Yet"
              description="Find a fashion business and request a service."
              className="border-none py-8"
            />
          ) : (
            <ul className="space-y-2">
              {activeServiceRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/account/requests/${request.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40"
                  >
                    <div>
                      <p className="font-medium text-foreground">{request.business.name}</p>
                      <p className="text-xs text-muted-foreground">{request.requestCode}</p>
                    </div>
                    <ServiceRequestStatusBadge status={request.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Your Orders</p>
            {recentOrders.length > 0 && (
              <Link href="/account/orders" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No Orders Yet"
              description="Orders you place with fashion businesses on Fashion360 will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {recentOrders.map((order) => {
                const business = linkedByCustomerId.get(order.customerId);
                return (
                  <li key={order.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{order.orderCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {business?.businessName} · {formatDate(order.orderDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-muted-foreground">{formatCurrency(order.totalValue, order.business.currency)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Digital Wardrobe</p>
            <Link href="/account/wardrobe" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View wardrobe <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {wardrobeItemCount === 0 ? (
            <EmptyState
              icon={Shirt}
              title="Your Wardrobe Is Empty"
              description="Pieces you commission or save will start building your digital wardrobe here."
            />
          ) : (
            <p className="text-sm text-muted-foreground">{wardrobeItemCount} item{wardrobeItemCount === 1 ? "" : "s"} in your wardrobe.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Favorite Businesses</p>
              {favoriteBusinesses.length > 0 && (
                <Link href="/account/favorites" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  View all <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
            {favoriteBusinesses.length === 0 ? (
              <EmptyState icon={Heart} title="No Favorites Yet" description="Save businesses and designs you love." className="border-none py-8" />
            ) : (
              <ul className="space-y-2">
                {favoriteBusinesses.map((f) => (
                  <li key={f.businessId}>
                    <Link
                      href={`/business/${f.business.profile?.username ?? f.business.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40"
                    >
                      {f.business.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.business.logoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-primary">
                          {f.business.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-foreground">{f.business.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Recommended For You</p>
              </div>
              <Link href="/account/for-you" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                See more <ChevronRight className="size-3.5" />
              </Link>
            </div>
            {designerRecs.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Explore a few designs and we'll personalize your feed"
                description="Browse designs and businesses to help us learn your style."
                className="border-none py-8"
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/account/discover">Go to Discover</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {designerRecs.map((r) => {
                  const business = recommendedBusinessById.get(r.targetId);
                  if (!business) return null;
                  return (
                    <li key={r.id}>
                      <Link href={`/business/${business.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm hover:border-primary/40">
                        <div className="flex items-center gap-3">
                          {business.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={business.logoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-primary">{business.name.charAt(0)}</div>
                          )}
                          <div>
                            <span className="font-medium text-foreground">{business.name}</span>
                            <p className="text-xs text-muted-foreground">{r.reasonText}</p>
                          </div>
                        </div>
                        {business.rating && business.rating.totalReviews > 0 && <StarRating value={business.rating.averageRating} size="sm" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
