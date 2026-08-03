import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountInfoForm } from "@/features/customer-account/components/account-info-form";
import { PrivacySettingsForm } from "@/features/customer-account/components/privacy-settings-form";
import { ConnectedBusinessesPanel } from "@/features/customer-account/components/connected-businesses-panel";
import { ChangePasswordForm } from "@/features/profile/components/change-password-form";
import { PersonalizationSettingsForm } from "@/features/personalization/components/personalization-settings-form";
import { getOrCreatePersonalizationSettings } from "@/lib/personalization-settings";

export default async function CustomerSettingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, profile] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { firstName: true, lastName: true, phone: true } }),
    prisma.customerProfile.findUniqueOrThrow({
      where: { userId },
      include: {
        privacySettings: true,
        businessRelationships: {
          select: { id: true, status: true, initiatedBy: true, business: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);
  const personalizationSettings = await getOrCreatePersonalizationSettings(prisma, profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, privacy, and business relationships.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent>
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="businesses">Businesses</TabsTrigger>
              <TabsTrigger value="personalization">Personalization</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="pt-4">
              <AccountInfoForm defaultValues={{ firstName: user.firstName ?? "", lastName: user.lastName ?? "", phone: user.phone ?? "" }} />
            </TabsContent>

            <TabsContent value="password" className="pt-4">
              <ChangePasswordForm />
            </TabsContent>

            <TabsContent value="privacy" className="pt-4">
              <PrivacySettingsForm
                defaultValues={{
                  profileVisibility: profile.privacySettings?.profileVisibility ?? "BUSINESS_ONLY",
                  allowMeasurementAccessByDefault: profile.privacySettings?.allowMeasurementAccessByDefault ?? false,
                  allowDesignSharing: profile.privacySettings?.allowDesignSharing ?? true,
                  allowOrderDataAccess: profile.privacySettings?.allowOrderDataAccess ?? true,
                }}
              />
            </TabsContent>

            <TabsContent value="businesses" className="pt-4">
              <ConnectedBusinessesPanel relationships={JSON.parse(JSON.stringify(profile.businessRelationships))} />
            </TabsContent>

            <TabsContent value="personalization" className="pt-4">
              <PersonalizationSettingsForm
                defaultValues={{
                  personalizationEnabled: personalizationSettings.personalizationEnabled,
                  locationDiscoveryEnabled: personalizationSettings.locationDiscoveryEnabled,
                  notifyNewDesignsFromSaved: personalizationSettings.notifyNewDesignsFromSaved,
                  notifyStyleMatches: personalizationSettings.notifyStyleMatches,
                  notifySavedDesignerServices: personalizationSettings.notifySavedDesignerServices,
                }}
                preferences={{ priceRangeMin: profile.priceRangeMin, priceRangeMax: profile.priceRangeMax }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
