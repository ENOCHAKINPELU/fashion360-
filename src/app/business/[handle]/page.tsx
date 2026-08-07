import { notFound } from "next/navigation";
import { MapPin, Globe, Phone, Mail, Clock, Link2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/shared/components/logo";
import { BusinessConnectCta } from "@/features/business/components/business-connect-cta";
import { BusinessFavoriteButton } from "@/features/discover/components/business-favorite-button";
import { RequestServiceDialog } from "@/features/discover/components/request-service-dialog";
import { MessageBusinessButton } from "@/features/messaging/components/message-business-button";
import { PortfolioGallery } from "@/features/discover/components/portfolio-gallery";
import { BookAppointmentDialog } from "@/features/appointments/components/book-appointment-dialog";
import { getBusinessTrustProfile } from "@/lib/business-trust-profile";
import { getBusinessResponseMetrics } from "@/lib/business-response-metrics";
import { serviceCategoryOptions } from "@/lib/validations/service";
import { StarRating } from "@/shared/components/star-rating";
import { TrustBadgesRow } from "@/shared/components/trust-badges-row";
import { PublicReviewsSection } from "@/features/discover/components/public-reviews-section";

const CATEGORY_LABELS = Object.fromEntries(serviceCategoryOptions.map((o) => [o.value, o.label]));
const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// Part 5/6: the profile-preview foundation, not the marketplace. PUBLIC is
// open to anyone; UNLISTED is open to anyone with this exact link (no
// gating — that's the definition); PRIVATE is only visible to the owning
// business's own signed-in staff (everyone else gets a clear "not public"
// message rather than a 404, so the link itself isn't a way to probe which
// handles exist).
export default async function BusinessPublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  const profile = await prisma.businessProfile.findUnique({ where: { username: handle } });
  const business = await prisma.business.findUnique({
    where: profile ? { id: profile.businessId } : { id: handle },
    include: {
      profile: true,
      specialties: { orderBy: { name: "asc" } },
      portfolioItems: { orderBy: { sortOrder: "asc" }, take: 24 },
      services: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!business || !business.profile) notFound();

  const session = await auth();
  const isOwner = session?.user?.businessId === business.id;

  if (business.profile.visibility === "PRIVATE" && !isOwner) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-14 text-center">
        <Logo mark />
        <h1 className="mt-5 text-xl font-semibold text-foreground">This profile is private</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {business.name} has chosen to keep their Fashion360 profile private. Reach out to them directly if you have their contact details.
        </p>
      </div>
    );
  }

  const customerProfileId =
    session?.user?.role === "CUSTOMER"
      ? (await prisma.customerProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } }))?.id
      : undefined;

  const [trust, responseMetrics, businessRating, trustBadgeAssignments, businessFavorited, favoritedPortfolioIds, activeRelationship] = await Promise.all([
    getBusinessTrustProfile(prisma, business.id),
    getBusinessResponseMetrics(prisma, business.id),
    prisma.businessRating.findUnique({ where: { businessId: business.id } }),
    prisma.trustBadgeAssignment.findMany({ where: { businessId: business.id }, include: { trustBadge: { select: { type: true, label: true } } } }),
    customerProfileId
      ? prisma.businessFavorite.findUnique({ where: { customerProfileId_businessId: { customerProfileId, businessId: business.id } } })
      : Promise.resolve(null),
    customerProfileId
      ? prisma.portfolioFavorite.findMany({
          where: { customerProfileId, portfolioItem: { businessId: business.id } },
          select: { portfolioItemId: true },
        })
      : Promise.resolve([]),
    customerProfileId
      ? prisma.businessCustomerRelationship.findUnique({
          where: { businessId_customerProfileId: { businessId: business.id, customerProfileId } },
        })
      : Promise.resolve(null),
  ]);

  const location = [business.city, business.state, business.country].filter(Boolean).join(", ");
  const workingHours = business.workingHours as Record<string, { open: string; close: string; closed: boolean }> | null;
  const socialLinks = business.socialLinks as { instagram?: string; facebook?: string; whatsapp?: string } | null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--accent-soft),_var(--background)_55%)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="size-20 shrink-0 rounded-2xl object-cover ring-1 ring-border" />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-2xl font-semibold text-primary">
                {business.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-xl font-semibold text-foreground">{business.name}</h1>
                {trust.isVerified && <Badge className="bg-success-soft text-success hover:bg-success-soft">Verified</Badge>}
                {business.profile.visibility === "UNLISTED" && <Badge variant="outline">Unlisted</Badge>}
              </div>
              {business.profile.description && <p className="text-sm text-muted-foreground">{business.profile.description}</p>}
              <div className="flex justify-center sm:justify-start">
                <TrustBadgesRow badges={trustBadgeAssignments.map((a) => a.trustBadge)} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {location}
                  </span>
                )}
                {business.profile.serviceArea && (
                  <span className="flex items-center gap-1">Serves: {business.profile.serviceArea}</span>
                )}
                {business.profile.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="size-3.5" /> {business.profile.website}
                  </span>
                )}
                {business.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3.5" /> {business.phone}
                  </span>
                )}
                {business.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3.5" /> {business.email}
                  </span>
                )}
                {socialLinks?.instagram && (
                  <span className="flex items-center gap-1">
                    <Link2 className="size-3.5" /> Instagram: {socialLinks.instagram}
                  </span>
                )}
                {socialLinks?.facebook && (
                  <span className="flex items-center gap-1">
                    <Link2 className="size-3.5" /> Facebook: {socialLinks.facebook}
                  </span>
                )}
              </div>
              {!isOwner && customerProfileId && (
                <div className="flex justify-center sm:justify-start">
                  <BusinessFavoriteButton businessId={business.id} initialFavorited={!!businessFavorited} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {business.specialties.length > 0 && (
              <Card className="border-none shadow-sm">
                <CardContent>
                  <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {business.specialties.map((s) => (
                      <Badge key={s.id} variant="outline">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {business.services.length > 0 && (
              <Card className="border-none shadow-sm">
                <CardContent>
                  <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Services</p>
                  <ul className="space-y-2">
                    {business.services.map((service) => (
                      <li key={service.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{service.name}</p>
                          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[service.category] ?? service.category}</span>
                        </div>
                        {service.description && <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>}
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {(service.priceMin || service.priceMax) && (
                            <span>
                              {service.priceMin ? `From ${service.priceMin}` : ""}
                              {service.priceMax ? ` – ${service.priceMax}` : ""}
                            </span>
                          )}
                          {service.estimatedDurationDays && <span>~{service.estimatedDurationDays} days</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="border-none shadow-sm">
              <CardContent>
                <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Portfolio</p>
                <PortfolioGallery
                  items={business.portfolioItems.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
                  favoritedIds={favoritedPortfolioIds.map((f) => f.portfolioItemId)}
                />
              </CardContent>
            </Card>

            {workingHours && (
              <Card className="border-none shadow-sm">
                <CardContent>
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <Clock className="size-3.5" /> Business Hours
                  </p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-1">
                    {Object.entries(WEEKDAY_LABELS).map(([key, label]) => {
                      const hours = workingHours[key];
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="text-foreground">{hours?.closed ? "Closed" : hours ? `${hours.open} – ${hours.close}` : "N/A"}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardContent className="space-y-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Trust</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  {trust.reviewCount === 0 ? (
                    <span className="text-foreground">Not yet rated</span>
                  ) : (
                    <StarRating value={trust.averageRating ?? 0} showValue />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reviews</span>
                  <span className="text-foreground">{trust.reviewCount === 0 ? "No reviews yet" : trust.reviewCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed Orders</span>
                  <span className="text-foreground">{trust.completedOrders === 0 ? "No completed orders yet" : trust.completedOrders}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response Rate</span>
                  <span className="text-foreground">{responseMetrics.responseRate == null ? "No data yet" : `${responseMetrics.responseRate}%`}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="text-foreground">
                    {responseMetrics.avgResponseTimeHours == null ? "No data yet" : `~${responseMetrics.avgResponseTimeHours}h`}
                  </span>
                </div>
                {business.profile.yearsOfExperience != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Years Active</span>
                    <span className="text-foreground">{business.profile.yearsOfExperience}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isOwner && (
              <Card className="border-none shadow-sm">
                <CardContent className="space-y-2">
                  <RequestServiceDialog
                    businessId={business.id}
                    businessName={business.name}
                    services={business.services.map((s) => ({
                      id: s.id,
                      name: s.name,
                      priceMin: s.priceMin?.toString() ?? null,
                      priceMax: s.priceMax?.toString() ?? null,
                    }))}
                  />
                  {activeRelationship?.status === "ACTIVE" && <BookAppointmentDialog businessId={business.id} businessName={business.name} />}
                  {customerProfileId && <MessageBusinessButton businessId={business.id} />}
                  <BusinessConnectCta businessId={business.id} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="mt-6">
          <PublicReviewsSection
            businessId={business.id}
            rating={{
              averageRating: businessRating?.averageRating ?? 0,
              totalReviews: businessRating?.totalReviews ?? 0,
              verifiedReviewCount: businessRating?.verifiedReviewCount ?? 0,
              categoryAverages: (businessRating?.categoryAverages as Record<string, number> | null) ?? null,
            }}
            badges={trustBadgeAssignments.map((a) => a.trustBadge)}
          />
        </div>
      </div>
    </div>
  );
}
