import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerInfoSidebar } from "@/features/customers/components/customer-info-sidebar";
import { CustomerQuickActions } from "@/features/customers/components/customer-quick-actions";
import { CustomerOverviewCards } from "@/features/customers/components/customer-overview-cards";
import { CustomerActivityTimeline } from "@/features/customers/components/customer-activity-timeline";
import { CustomerActivityLogTab } from "@/features/customers/components/customer-activity-log-tab";
import { CustomerNotesPanel } from "@/features/customers/components/customer-notes-panel";
import { CustomerPreferencesPanel } from "@/features/customers/components/customer-preferences-panel";
import { CustomerFilesPanel } from "@/features/customers/components/customer-files-panel";
import { CustomerOrdersPanel } from "@/features/customers/components/customer-orders-panel";
import { CustomerFinancialPanel } from "@/features/customers/components/customer-financial-panel";
import { CustomerAppointmentsPanel } from "@/features/customers/components/customer-appointments-panel";
import { CustomerMeasurementsPanel } from "@/features/customers/components/customer-measurements-panel";
import { CustomerDeliveryPanel } from "@/features/customers/components/customer-delivery-panel";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      tags: true,
      preferences: true,
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      files: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } },
    },
  });

  if (!customer) notFound();

  const activityCount = await prisma.customerActivity.count({ where: { customerId: id } });
  const deliveries = await prisma.delivery.findMany({
    where: { order: { customerId: id, businessId } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      trackingNumber: true,
      estimatedDeliveryDate: true,
      order: { select: { id: true, orderCode: true } },
    },
  });
  const serialized = JSON.parse(JSON.stringify(customer));
  const serializedDeliveries = JSON.parse(JSON.stringify(deliveries));
  const lastVisit = customer.activities[0]?.createdAt.toISOString() ?? null;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to customers
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <CustomerInfoSidebar customer={serialized} />

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardContent>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick Actions</p>
              <CustomerQuickActions
                customer={{
                  id: customer.id,
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  customerCode: customer.customerCode,
                  email: customer.email,
                  phone: customer.phone,
                }}
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="overview">
            <div className="overflow-x-auto scrollbar-thin">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="quotations">Quotations</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="measurements">Measurements</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <CustomerOverviewCards lastVisit={lastVisit} />

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="border-none shadow-sm">
                  <CardContent>
                    <p className="mb-4 text-sm font-semibold text-foreground">Recent Activity</p>
                    <CustomerActivityTimeline activities={serialized.activities} />
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardContent>
                    <p className="mb-4 text-sm font-semibold text-foreground">Notes</p>
                    <CustomerNotesPanel customerId={customer.id} notes={serialized.notes} />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-none shadow-sm">
                <CardContent>
                  <p className="mb-4 text-sm font-semibold text-foreground">Preferences</p>
                  <CustomerPreferencesPanel customerId={customer.id} preferences={serialized.preferences} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerOrdersPanel customerId={customer.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotations">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerFinancialPanel customerId={customer.id} view="quotations" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerFinancialPanel customerId={customer.id} view="invoices" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerFinancialPanel customerId={customer.id} view="payments" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appointments">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerAppointmentsPanel customerId={customer.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="measurements">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerMeasurementsPanel customerId={customer.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivery">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerDeliveryPanel deliveries={serializedDeliveries} customerId={customer.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <ModulePlaceholder
                icon={Star}
                title="Reviews"
                description="Reviews are tied to a customer's self-service Fashion360 account, not this business contact record, so they can't be reliably matched here yet. Use the Reviews tab to search by customer name."
              />
            </TabsContent>

            <TabsContent value="activity-log">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerActivityLogTab
                    customerId={customer.id}
                    initialActivities={serialized.activities}
                    initialTotalPages={Math.max(1, Math.ceil(activityCount / 25))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card className="border-none shadow-sm">
                <CardContent>
                  <CustomerFilesPanel customerId={customer.id} files={serialized.files} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
