import Link from "next/link";
import { ChevronRight, Users, ShoppingBag, Shirt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { computePassportCompletion } from "@/lib/fashion-passport";
import { getLinkedCustomerRecords } from "@/lib/customer-linked-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerProfileForm } from "@/features/customer-account/components/customer-profile-form";

export default async function FashionPassportPage() {
  const { profile } = await requireCustomerContext();

  const [full, completion, linked, wardrobeItemCount] = await Promise.all([
    prisma.customerProfile.findUniqueOrThrow({ where: { id: profile.id }, include: { fashionPassport: true } }),
    computePassportCompletion(prisma, profile),
    getLinkedCustomerRecords(profile.id),
    prisma.customerWardrobeItem.count({ where: { customerProfileId: profile.id } }),
  ]);

  const customerIds = linked.map((l) => l.customerId);
  const orderCount = customerIds.length
    ? await prisma.order.count({ where: { customerId: { in: customerIds }, isArchived: false } })
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Fashion Passport</h1>
          <p className="text-sm text-muted-foreground">
            {full.fashionPassport?.passportCode ?? "Your unique passport ID"} · Your style identity across every business you work with.
          </p>
        </div>
        <Badge className={completion.status === "COMPLETE" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}>
          {completion.completionPercent}% complete
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{linked.length}</p>
              <p className="text-xs text-muted-foreground">Connected Designers</p>
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
              <Shirt className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{wardrobeItemCount}</p>
              <p className="text-xs text-muted-foreground">Wardrobe Items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {completion.missingItems.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Finish your passport</p>
            <ul className="space-y-1.5">
              {completion.missingItems.map((item) => (
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
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardContent>
          <CustomerProfileForm
            mode="settings"
            defaultValues={{
              username: full.username ?? "",
              profilePhotoUrl: full.profilePhotoUrl ?? "",
              phone: full.phone ?? "",
              country: full.country ?? "Nigeria",
              state: full.state ?? "",
              city: full.city ?? "",
              gender: full.gender ?? undefined,
              dateOfBirth: full.dateOfBirth ? full.dateOfBirth.toISOString().slice(0, 10) : "",
              preferredFit: full.preferredFit ?? undefined,
              favoriteColors: full.favoriteColors,
              favoriteFabrics: full.favoriteFabrics,
              stylePreferences: full.stylePreferences,
              fashionInterests: full.fashionInterests,
              preferredClothingCategories: full.preferredClothingCategories,
              commonOccasions: full.commonOccasions,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
