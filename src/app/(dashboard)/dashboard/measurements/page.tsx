import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasurementsDashboardStats } from "@/features/measurements/components/measurements-dashboard-stats";
import { RecentSessionsWidget } from "@/features/measurements/components/recent-sessions-widget";
import { MeasurementActivityWidget } from "@/features/measurements/components/measurement-activity-widget";
import { CustomersWithoutMeasurementsWidget } from "@/features/measurements/components/customers-without-measurements-widget";
import { MeasurementsDashboardClient } from "@/features/measurements/components/measurements-dashboard-client";

export default async function MeasurementsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const prefilledCustomer = customerId
    ? await prisma.customer.findFirst({
        where: { id: customerId, businessId },
        select: { id: true, firstName: true, lastName: true, phone: true, profilePhotoUrl: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Measurements</h1>
        <p className="text-sm text-muted-foreground">Digital measurement records, reusable across every order.</p>
      </div>

      <Suspense>
        <MeasurementsDashboardStats businessId={businessId} />
      </Suspense>

      <Suspense>
        <MeasurementsDashboardClient prefilledCustomer={prefilledCustomer ?? undefined} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent Measurement Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <RecentSessionsWidget businessId={businessId} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Measurement Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <MeasurementActivityWidget businessId={businessId} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Customers Without Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <CustomersWithoutMeasurementsWidget businessId={businessId} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
