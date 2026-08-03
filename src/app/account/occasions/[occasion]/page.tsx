import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getOccasionDiscovery } from "@/lib/occasion-discovery";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { StarRating } from "@/shared/components/star-rating";
import { TrustBadgesRow } from "@/shared/components/trust-badges-row";
import { Compass } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function OccasionDiscoveryPage({ params }: { params: Promise<{ occasion: string }> }) {
  await requireCustomerContext();
  const { occasion } = await params;
  const result = await getOccasionDiscovery(prisma, occasion);
  if (!result) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{result.occasion.label}</h1>
        <p className="text-sm text-muted-foreground">Designers, designs, and services for {result.occasion.label.toLowerCase()}.</p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Designers</p>
        {result.businesses.length === 0 ? (
          <EmptyState icon={Compass} title="No designers found yet" description="Check back soon." className="border-none py-8" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {result.businesses.map((b) => (
              <Link key={b.id} href={`/business/${b.id}`}>
                <Card className="border-none shadow-sm">
                  <CardContent className="space-y-1.5 p-3 text-center">
                    {b.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logoUrl} alt={b.name} className="mx-auto size-14 rounded-xl object-cover ring-1 ring-border" />
                    ) : (
                      <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-accent-soft text-lg font-semibold text-primary">{b.name.charAt(0)}</div>
                    )}
                    <p className="truncate text-sm font-medium text-foreground">{b.name}</p>
                    {b.rating && b.rating.totalReviews > 0 && (
                      <div className="flex justify-center">
                        <StarRating value={b.rating.averageRating} size="sm" />
                      </div>
                    )}
                    <div className="flex justify-center">
                      <TrustBadgesRow badges={b.trustBadgeAssignments.map((a) => a.trustBadge)} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Designs</p>
        {result.designs.length === 0 ? (
          <EmptyState icon={Compass} title="No designs found yet" description="Check back soon." className="border-none py-8" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {result.designs.map((d) => (
              <Link key={d.id} href={`/account/designs/browse/${d.id}`}>
                <Card className="overflow-hidden border-none shadow-sm">
                  <div className="aspect-[3/4] bg-muted">
                    {d.mainImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.mainImageUrl} alt={d.name} className="size-full object-cover" />
                    ) : null}
                  </div>
                  <CardContent className="space-y-0.5 p-2.5">
                    <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.business.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Services</p>
        {result.services.length === 0 ? (
          <EmptyState icon={Compass} title="No services found yet" description="Check back soon." className="border-none py-8" />
        ) : (
          <div className="space-y-2">
            {result.services.map((s) => (
              <Card key={s.id} className="border-none shadow-sm">
                <CardContent className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.business.name}</p>
                  </div>
                  {(s.priceMin || s.priceMax) && (
                    <span className="text-xs text-muted-foreground">
                      {s.priceMin ? `From ${formatCurrency(Number(s.priceMin), "NGN")}` : ""}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
