import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOrCreatePlatformSettings } from "@/lib/platform-settings";
import { getOrCreateRankingFactors } from "@/lib/ranking-factors";
import { getOrCreatePersonalizationWeights } from "@/lib/personalization-weights";
import { AdminPlatformSettingsClient } from "@/features/admin/components/admin-platform-settings-client";
import { AdminWeightTuningClient } from "@/features/admin/components/admin-weight-tuning-client";

// Three previously-orphaned admin capabilities (each had a working API and
// no page): platform fee/dispute-window config, discovery ranking weights,
// and personalization weights. Grouped here as one "Settings" surface since
// they're all the same kind of thing — platform-wide tuning knobs a
// business can never touch, changeable without a deploy.
export default async function AdminSettingsPage() {
  const [platformSettings, rankingFactors, personalizationWeights] = await Promise.all([
    getOrCreatePlatformSettings(prisma),
    getOrCreateRankingFactors(prisma),
    getOrCreatePersonalizationWeights(prisma),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Fee, dispute policy, and discovery/personalization tuning — platform-wide, never business-editable.</p>
      </div>

      <Tabs defaultValue="platform">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList>
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="ranking">Discovery Ranking</TabsTrigger>
            <TabsTrigger value="personalization">Personalization</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="platform">
          <AdminPlatformSettingsClient
            initial={{
              platformFeePercentage: platformSettings.platformFeePercentage,
              disputeWindowDays: platformSettings.disputeWindowDays,
            }}
          />
        </TabsContent>

        <TabsContent value="ranking">
          <AdminWeightTuningClient
            title="Discovery Ranking Factors"
            description="How businesses are ranked in search and discovery. Weights are relative to each other, not a fixed 0-100 scale."
            endpoint="/api/admin/ranking-factors"
            initial={JSON.parse(JSON.stringify(rankingFactors))}
            min={0}
            max={100}
          />
        </TabsContent>

        <TabsContent value="personalization">
          <AdminWeightTuningClient
            title="Personalization Weights"
            description="How much each customer behavior signal shifts their personalized recommendations. Negative weights suppress future recommendations."
            endpoint="/api/admin/personalization-weights"
            initial={JSON.parse(JSON.stringify(personalizationWeights))}
            min={-100}
            max={100}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
