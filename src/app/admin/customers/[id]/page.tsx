import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminCustomerActions } from "@/features/admin/components/admin-customer-actions";
import {
  ShieldCheck,
  Ban,
  ShoppingBag,
  Users,
  Star,
  ArrowLeft,
  CreditCard,
  Inbox,
  Ruler,
  Bell,
  History,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCustomerActivityTimeline } from "@/lib/admin-customers";

const RELATIONSHIP_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  DECLINED: "Declined",
  REVOKED: "Revoked",
};

function SectionEmpty({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <EmptyState icon={Icon} title={title} className="border-none py-8" />;
}

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
      user: { select: { id: true, name: true, email: true, emailVerified: true, image: true, suspendedAt: true, suspendedReason: true } },
      orders: {
        orderBy: { orderDate: "desc" },
        take: 20,
        select: {
          id: true,
          orderCode: true,
          status: true,
          paymentStatus: true,
          totalValue: true,
          orderDate: true,
          business: { select: { name: true } },
          delivery: { select: { status: true } },
        },
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, requestCode: true, status: true, createdAt: true, updatedAt: true, business: { select: { name: true } } },
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
      measurementProfiles: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true, isDefault: true, preferredUnit: true, updatedAt: true },
      },
    },
  });

  if (!customer) notFound();

  const [payments, notifications, activity] = await Promise.all([
    prisma.payment.findMany({
      where: { order: { customerProfileId: id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, amount: true, currency: true, method: true, status: true, createdAt: true, order: { select: { orderCode: true } } },
    }),
    prisma.notification.findMany({
      where: { customerProfileId: id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, title: true, body: true, type: true, readAt: true, createdAt: true },
    }),
    getCustomerActivityTimeline(id, customer.user.id),
  ]);

  const completedOrders = customer.orders.filter((o) => o.status === "COMPLETED").length;
  const cancelledOrders = customer.orders.filter((o) => o.status === "CANCELLED").length;
  const totalSpend = payments.filter((p) => p.status === "SUCCESSFUL").reduce((sum, p) => sum + p.amount, 0);
  const suspended = !!customer.user.suspendedAt;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
            {suspended ? (
              <Badge className="gap-1 bg-danger-soft text-danger">
                <Ban className="size-3" /> Suspended
              </Badge>
            ) : (
              <Badge className="gap-1 bg-success-soft text-success">
                <ShieldCheck className="size-3" /> Active
              </Badge>
            )}
            {customer.reviewPrivilegesSuspendedAt && <Badge className="bg-warning-soft text-warning">Review privileges suspended</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{customer.user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/requests?customerId=${customer.id}`}>
            <Button size="default" variant="outline">
              View Requests
            </Button>
          </Link>
          <Link href={`/admin/orders?customerProfileId=${customer.id}`}>
            <Button size="default" variant="outline">
              View Orders
            </Button>
          </Link>
          <Link href={`/admin/payments?customerId=${customer.id}`}>
            <Button size="default" variant="outline">
              View Payments
            </Button>
          </Link>
          <Link href={`/admin/deliveries?customerProfileId=${customer.id}`}>
            <Button size="default" variant="outline">
              View Deliveries
            </Button>
          </Link>
          <AdminCustomerActions customerId={customer.id} suspended={suspended} size="default" />
        </div>
      </div>

      {suspended && customer.user.suspendedReason && (
        <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm text-danger">
          <strong>Suspended:</strong> {customer.user.suspendedReason}
        </div>
      )}

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Registered</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(customer.createdAt)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{customer.orders.length}</p>
            <p className="text-xs text-muted-foreground">
              {completedOrders} completed · {cancelledOrders} cancelled
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalSpend, "NGN")}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="mt-1 text-sm text-foreground">{customer.phone ?? "No phone on file"}</p>
            <p className="text-sm text-foreground">{[customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "No location on file"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Measurements — only shown if the customer has actually saved one */}
      {customer.measurementProfiles.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="size-4" /> Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.measurementProfiles.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{m.name}</p>
                  {m.isDefault && <Badge variant="outline">Default</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{m.preferredUnit}</span>
                  <Badge variant="outline">{m.status}</Badge>
                  <span>Updated {formatDate(m.updatedAt)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Order History */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="size-4" /> Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.orders.length === 0 ? (
            <SectionEmpty icon={ShoppingBag} title="No orders yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Designer</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Payment</th>
                    <th className="py-2 font-medium">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-medium text-foreground">
                        <Link href="/admin/orders" className="hover:underline">
                          {o.orderCode}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{o.business.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{formatDate(o.orderDate)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(o.totalValue, "NGN")}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{o.paymentStatus.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{o.delivery?.status.replace(/_/g, " ") ?? "Not yet"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="size-4" /> Request History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.serviceRequests.length === 0 ? (
            <SectionEmpty icon={Inbox} title="No requests yet" />
          ) : (
            <div className="space-y-2">
              {customer.serviceRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{r.requestCode}</p>
                    <p className="text-xs text-muted-foreground">{r.business.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline">{r.status.replace(/_/g, " ")}</Badge>
                    <span>Created {formatDate(r.createdAt)}</span>
                    <span>Updated {formatDate(r.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" /> Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <SectionEmpty icon={CreditCard} title="No payments yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2 pr-3 font-medium">Transaction</th>
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Method</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">{p.id}</td>
                      <td className="py-2 pr-3 text-foreground">{p.order.orderCode}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(p.amount, p.currency)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{p.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{p.method.replace(/_/g, " ")}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-4" /> Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.reviews.length === 0 ? (
            <SectionEmpty icon={Star} title="No reviews yet" />
          ) : (
            <div className="space-y-3">
              {customer.reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {r.business.name} · {r.overallRating}★
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.status}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.bodyText}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <SectionEmpty icon={Bell} title="No notifications yet" />
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Designer Relationships */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> Designer Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.businessRelationships.length === 0 ? (
            <SectionEmpty icon={Users} title="No designer relationships yet" />
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

      {/* Activity Timeline */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" /> Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <SectionEmpty icon={History} title="No activity yet" />
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="text-foreground">{item.description}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
