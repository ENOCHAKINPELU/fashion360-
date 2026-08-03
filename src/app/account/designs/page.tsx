import Link from "next/link";
import { Shirt, History, Compass } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getLinkedCustomerRecords } from "@/lib/customer-linked-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

export default async function CustomerDesignsPage() {
  const { profile } = await requireCustomerContext();
  const linked = await getLinkedCustomerRecords(profile.id);
  const linkedByCustomerId = new Map(linked.map((l) => [l.customerId, l]));
  const customerIds = linked.map((l) => l.customerId);

  const [legacyFavorites, selfServiceFavorites, designHistory] = await Promise.all([
    customerIds.length
      ? prisma.designFavorite.findMany({
          where: { customerId: { in: customerIds } },
          orderBy: { createdAt: "desc" },
          include: { design: { select: { id: true, name: true, mainImageUrl: true, designCode: true } } },
        })
      : Promise.resolve([]),
    // Part 6 (Phase 10): the marketplace-wide self-service save path.
    prisma.designFavorite.findMany({
      where: { customerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: { design: { select: { id: true, name: true, mainImageUrl: true, designCode: true } } },
    }),
    prisma.customerDesignHistory.findMany({ where: { customerProfileId: profile.id }, orderBy: { occurredAt: "desc" } }),
  ]);

  const selfServiceBusinessIds = [...new Set(selfServiceFavorites.map((f) => f.businessId))];
  const selfServiceBusinesses = selfServiceBusinessIds.length
    ? await prisma.business.findMany({ where: { id: { in: selfServiceBusinessIds } }, select: { id: true, name: true } })
    : [];
  const businessNameById = new Map(selfServiceBusinesses.map((b) => [b.id, b.name]));

  const favorites = [
    ...selfServiceFavorites.map((f) => ({ id: f.id, design: f.design, businessName: businessNameById.get(f.businessId) ?? null })),
    ...legacyFavorites.map((f) => ({ id: f.id, design: f.design, businessName: (f.customerId ? linkedByCustomerId.get(f.customerId) : undefined)?.businessName ?? null })),
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Designs</h1>
          <p className="text-sm text-muted-foreground">Designs you&apos;ve saved, plus a history of designs across the businesses you work with.</p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/account/designs/browse">
            <Compass className="size-4" /> Browse Designs
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Favorites</p>
        {favorites.length === 0 ? (
          <EmptyState icon={Shirt} title="No Favorites Yet" description="Save designs to improve your recommendations." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map((fav) => (
              <Link key={fav.id} href={`/account/designs/browse/${fav.design.id}`}>
                <Card className="overflow-hidden border-none shadow-sm transition-shadow hover:shadow-md">
                  <div className="aspect-[3/4] bg-muted">
                    {fav.design.mainImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fav.design.mainImageUrl} alt={fav.design.name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Shirt className="size-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-0.5 p-3">
                    <p className="truncate text-sm font-medium text-foreground">{fav.design.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{fav.businessName}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Design History</p>
        {designHistory.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Design History Yet"
            description="A record of designs you've approved or ordered will build up here as you work with businesses on Fashion360."
          />
        ) : (
          <ul className="space-y-2">
            {designHistory.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{entry.designName}</p>
                  <p className="text-xs text-muted-foreground">{entry.designerName ?? "Unknown designer"}{entry.status ? ` · ${entry.status}` : ""}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(entry.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
