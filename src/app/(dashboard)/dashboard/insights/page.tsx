import { Eye, Heart, MessageSquare, Star, TrendingUp, MousePointerClick } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessInsights } from "@/lib/business-insights";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";

// Part 26: aggregated, privacy-safe — see lib/business-insights.ts for the
// guarantee that nothing here traces back to one customer's individual
// browsing/saves/wardrobe.
export default async function BusinessInsightsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const insights = await getBusinessInsights(prisma, businessId);

  const hasAnyActivity = insights.designViews + insights.designSaves + insights.portfolioViews + insights.serviceRequests + insights.recommendationImpressions > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground">How customers are discovering and engaging with your business, last {insights.windowDays} days.</p>
      </div>

      {!hasAnyActivity ? (
        <EmptyState icon={TrendingUp} title="No Activity Yet" description="Customer interest and engagement will appear here once your designs and services start getting views." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="border-none shadow-sm">
              <CardContent className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
                  <Eye className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{insights.designViews}</p>
                  <p className="text-xs text-muted-foreground">Design Views</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
                  <Heart className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{insights.designSaves}</p>
                  <p className="text-xs text-muted-foreground">Design Saves</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{insights.serviceRequests}</p>
                  <p className="text-xs text-muted-foreground">Service Requests</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
                  <Star className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{insights.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{insights.newReviews} new reviews</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <MousePointerClick className="size-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Recommendation Performance</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                  <p className="font-semibold text-foreground">{insights.recommendationImpressions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                  <p className="font-semibold text-foreground">{insights.recommendationClicks}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Click-Through Rate</p>
                  <p className="font-semibold text-foreground">{insights.recommendationCtr}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  <p className="font-semibold text-foreground">{insights.recommendationConversionRate}%</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">How often your recommended designs/services are shown, clicked, saved, or requested by customers.</p>
            </CardContent>
          </Card>

          {insights.popularServices.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardContent>
                <p className="mb-3 text-sm font-semibold text-foreground">Popular Services</p>
                <ul className="space-y-2">
                  {insights.popularServices.map((s, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                      <span className="text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.requestCount} request{s.requestCount === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
