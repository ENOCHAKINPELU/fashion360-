import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BusinessDetailsForm } from "@/features/business/components/business-details-form";
import { BrandHoursForm } from "@/features/settings/components/brand-hours-form";
import { NotificationsForm } from "@/features/settings/components/notifications-form";
import { ChangePasswordForm } from "@/features/profile/components/change-password-form";
import { BusinessPublicProfileForm } from "@/features/business/components/business-public-profile-form";
import { SpecialtiesManager } from "@/features/business/components/specialties-manager";
import { PortfolioManager } from "@/features/business/components/portfolio-manager";
import { ServicesManager } from "@/features/business/components/services-manager";
import { DiscoveryAvailabilityToggle } from "@/features/business/components/discovery-availability-toggle";
import { BusinessCompletionBanner } from "@/features/business/components/business-completion-banner";
import { BusinessTrustProfileCard } from "@/features/business/components/business-trust-profile-card";
import { BusinessVerificationPanel } from "@/features/business/components/business-verification-panel";
import { computeBusinessProfileCompletion } from "@/lib/business-profile-completion";
import { getBusinessTrustProfile } from "@/lib/business-trust-profile";
import { getBusinessResponseMetrics } from "@/lib/business-response-metrics";
import type { NotificationPreferencesInput } from "@/lib/validations/profile";

export default async function SettingsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [business, user, businessProfile, specialties, portfolioItems, services, discoverySettings, completion, trust, responseMetrics, verification] =
    await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.user.findUnique({ where: { id: session!.user.id } }),
      prisma.businessProfile.upsert({ where: { businessId }, update: {}, create: { businessId } }),
      prisma.businessSpecialty.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
      prisma.businessPortfolioItem.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } }),
      prisma.businessService.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } }),
      prisma.businessDiscoverySettings.upsert({ where: { businessId }, update: {}, create: { businessId } }),
      computeBusinessProfileCompletion(prisma, businessId),
      getBusinessTrustProfile(prisma, businessId),
      getBusinessResponseMetrics(prisma, businessId),
      prisma.businessVerification.findUnique({ where: { businessId } }),
    ]);

  if (!business) return null;

  const brandColors = (business.brandColors as { primary?: string; secondary?: string } | null) ?? undefined;
  const workingHours =
    (business.workingHours as Record<string, { open: string; close: string; closed: boolean }> | null) ??
    undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business profile and preferences.</p>
      </div>

      <BusinessCompletionBanner completionPercent={completion.completionPercent} missingItems={completion.missingItems} />

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business Profile</TabsTrigger>
          <TabsTrigger value="public">Public Profile</TabsTrigger>
          <TabsTrigger value="brand">Brand &amp; Hours</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-none shadow-sm">
          <CardContent>
            <TabsContent value="business">
              <BusinessDetailsForm
                mode="update"
                defaultValues={{
                  name: business.name,
                  logoUrl: business.logoUrl ?? "",
                  email: business.email ?? "",
                  phone: business.phone ?? "",
                  country: business.country ?? "",
                  state: business.state ?? "",
                  city: business.city ?? "",
                  address: business.address ?? "",
                  businessType: business.businessType,
                  currency: business.currency,
                  timezone: business.timezone,
                  measurementUnit: business.measurementUnit,
                }}
              />
            </TabsContent>

            <TabsContent value="public" className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">How customers see your business on Fashion360.</p>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={`/business/${businessProfile.username ?? business.id}`} target="_blank">
                    Preview Profile <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>

              <BusinessTrustProfileCard
                isVerified={trust.isVerified}
                completedOrders={trust.completedOrders}
                averageRating={trust.averageRating}
                reviewCount={trust.reviewCount}
              />

              <BusinessVerificationPanel initial={verification ? JSON.parse(JSON.stringify(verification)) : null} />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
                <div className="flex gap-6">
                  <span className="text-muted-foreground">
                    Response Rate: <span className="text-foreground">{responseMetrics.responseRate == null ? "No data yet" : `${responseMetrics.responseRate}%`}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Response Time: <span className="text-foreground">{responseMetrics.avgResponseTimeHours == null ? "No data yet" : `~${responseMetrics.avgResponseTimeHours}h`}</span>
                  </span>
                </div>
                <DiscoveryAvailabilityToggle initialAcceptingRequests={discoverySettings.isAcceptingRequests} />
              </div>

              <BusinessPublicProfileForm
                defaultValues={{
                  username: businessProfile.username ?? "",
                  description: businessProfile.description ?? "",
                  serviceArea: businessProfile.serviceArea ?? "",
                  website: businessProfile.website ?? "",
                  registrationNumber: businessProfile.registrationNumber ?? "",
                  visibility: businessProfile.visibility,
                  yearsOfExperience: businessProfile.yearsOfExperience != null ? String(businessProfile.yearsOfExperience) : "",
                }}
              />

              <div className="border-t border-border pt-6">
                <SpecialtiesManager specialties={specialties} />
              </div>

              <div className="border-t border-border pt-6">
                <PortfolioManager items={JSON.parse(JSON.stringify(portfolioItems))} />
              </div>

              <div className="border-t border-border pt-6">
                <ServicesManager services={JSON.parse(JSON.stringify(services))} />
              </div>
            </TabsContent>

            <TabsContent value="brand">
              <BrandHoursForm defaultBrandColors={brandColors} defaultWorkingHours={workingHours} />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsForm
                defaultValues={user?.notificationPreferences as Partial<NotificationPreferencesInput> | undefined}
              />
            </TabsContent>
            <TabsContent value="security">
              <ChangePasswordForm />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
