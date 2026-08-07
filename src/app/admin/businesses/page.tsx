import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

// No admin screen existed to browse/search businesses at all — an operator
// had no way to look one up outside a database console. Read-only for now
// (view + jump to their orders/payouts/reviews in the other admin tabs);
// suspend/edit actions can follow once there's a real need for them.
export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim();

  const businesses = await prisma.business.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      businessType: true,
      subscriptionPlan: true,
      city: true,
      country: true,
      createdAt: true,
      _count: { select: { orders: true, users: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Businesses</h1>
        <p className="text-sm text-muted-foreground">{businesses.length} business{businesses.length === 1 ? "" : "es"} on the platform.</p>
      </div>

      <form className="max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by name, email, or slug..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </form>

      {businesses.length === 0 ? (
        <EmptyState icon={Building2} title="No businesses found" description={search ? `No results for "${search}".` : "No businesses have signed up yet."} />
      ) : (
        <div className="space-y-2">
          {businesses.map((b) => (
            <Card key={b.id} className="border-none shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/business/${b.slug}`} target="_blank" className="text-sm font-medium text-foreground hover:underline">
                    {b.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {b.email ?? "No email"} {b.city && `· ${b.city}, ${b.country ?? ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{b.subscriptionPlan}</Badge>
                  <Badge variant="outline">{b.businessType.replace(/_/g, " ")}</Badge>
                  <span>{b._count.orders} orders</span>
                  <span>{b._count.users} staff</span>
                  <span>Joined {formatDate(b.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
