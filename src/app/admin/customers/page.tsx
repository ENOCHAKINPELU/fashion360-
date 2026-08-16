import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Users, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

// Admin Phase 2: the platform-wide customer directory — CustomerProfile is
// the real "customer" here (a real platform account, User.role CUSTOMER),
// distinct from the legacy per-business Customer CRM contact row a
// business can add for someone who's never signed up (that lives inside a
// single business's own dashboard, not here). Read-only for this phase,
// same posture as /admin/businesses: view + jump into their orders/reviews
// elsewhere in Admin; suspend/edit actions are a deliberate later phase,
// since no account-suspension mechanism exists in the schema yet — adding
// one is a real product decision, not something to slip in as a side
// effect of "browse the list".
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim();

  const customers = await prisma.customerProfile.findMany({
    where: search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      city: true,
      country: true,
      createdAt: true,
      user: { select: { name: true, email: true, emailVerified: true } },
      _count: { select: { orders: true, businessRelationships: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length} customer{customers.length === 1 ? "" : "s"} on the platform.
        </p>
      </div>

      <form className="max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by name, email, or phone..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={search ? `No results for "${search}".` : "No customers have signed up yet."}
        />
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <Link key={c.id} href={`/admin/customers/${c.id}`}>
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{c.user.name ?? "Unnamed customer"}</p>
                      {c.user.emailVerified && <ShieldCheck className="size-3.5 text-success" aria-label="Email verified" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.user.email} {c.city && `· ${c.city}, ${c.country ?? ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{c._count.orders} orders</Badge>
                    <Badge variant="outline">{c._count.businessRelationships} designers</Badge>
                    <span>Joined {formatDate(c.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
