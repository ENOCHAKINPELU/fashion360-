import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { ShieldCheck, ShoppingBag, Users, Star, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const RELATIONSHIP_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  DECLINED: "Declined",
  REVOKED: "Revoked",
};

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customerProfile.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      city: true,
      state: true,
      country: true,
      createdAt: true,
      reviewPrivilegesSuspendedAt: true,
      user: { select: { name: true, email: true, emailVerified: true, createdAt: true } },
      orders: {
        orderBy: { orderDate: "desc" },
        take: 20,
        select: { id: true, orderCode: true, status: true, totalValue: true, orderDate: true, business: { select: { name: true } } },
      },
      businessRelationships: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true, business: { select: { id: true, name: true } } },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, overallRating: true, bodyText: true, status: true, createdAt: true, business: { select: { name: true } } },
      },
    },
  });

  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Customers
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{customer.user.name ?? "Unnamed customer"}</h1>
          {customer.user.emailVerified && (
            <Badge className="gap-1 bg-success-soft text-success">
              <ShieldCheck className="size-3" /> Verified
            </Badge>
          )}
          {customer.reviewPrivilegesSuspendedAt && <Badge className="bg-danger-soft text-danger">Review privileges suspended</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{customer.user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="mt-1 text-sm text-foreground">{customer.phone ?? "No phone on file"}</p>
            <p className="text-sm text-foreground">
              {[customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "No location on file"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(customer.createdAt)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Activity</p>
            <p className="mt-1 text-sm text-foreground">
              {customer.orders.length} order{customer.orders.length === 1 ? "" : "s"} · {customer.businessRelationships.length} designer
              {customer.businessRelationships.length === 1 ? "" : "s"} · {customer.reviews.length} review{customer.reviews.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="size-4" /> Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" description="Orders this customer places will appear here." className="py-8" />
          ) : (
            <div className="space-y-2">
              {customer.orders.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{o.orderCode}</p>
                    <p className="text-xs text-muted-foreground">{o.business.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                    <span className="tabular-nums">{formatCurrency(o.totalValue, "NGN")}</span>
                    <span>{formatDate(o.orderDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> Designer Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.businessRelationships.length === 0 ? (
            <EmptyState icon={Users} title="No designer relationships yet" description="Businesses this customer connects with will appear here." className="py-8" />
          ) : (
            <div className="space-y-2">
              {customer.businessRelationships.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">{r.business.name}</p>
                  <Badge variant="outline">{RELATIONSHIP_LABEL[r.status] ?? r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-4" /> Reviews Left
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.reviews.length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet" description="Reviews this customer writes will appear here." className="py-8" />
          ) : (
            <div className="space-y-3">
              {customer.reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {r.business.name} · {r.overallRating}★
                    </p>
                    <Badge variant="outline">{r.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.bodyText}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
