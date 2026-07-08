import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, Wallet, CalendarClock } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { SampleBadge } from "@/features/dashboard/components/sample-badge";
import { RevenueChart } from "@/features/dashboard/components/revenue-chart";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { UpcomingTasks } from "@/features/dashboard/components/upcoming-tasks";
import { RecentCustomers } from "@/features/dashboard/components/recent-customers";
import { LatestOrders } from "@/features/dashboard/components/latest-orders";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";

export default async function DashboardPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const business = await prisma.business.findUnique({ where: { id: businessId } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back{business ? `, ${business.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s an overview of your business today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value="128" icon={Users} trend={{ value: "+12% this month", direction: "up" }} />
        <StatCard label="Active Orders" value="24" icon={ShoppingBag} trend={{ value: "+4 this week", direction: "up" }} />
        <StatCard label="Revenue" value="₦860,000" icon={Wallet} trend={{ value: "+18% this month", direction: "up" }} />
        <StatCard label="Appointments" value="9" icon={CalendarClock} trend={{ value: "2 today", direction: "up" }} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue</CardTitle>
            <SampleBadge />
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity businessId={businessId} userId={session!.user.id} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Tasks</CardTitle>
            <SampleBadge />
          </CardHeader>
          <CardContent>
            <UpcomingTasks />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Customers</CardTitle>
            <SampleBadge />
          </CardHeader>
          <CardContent>
            <RecentCustomers />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest Orders</CardTitle>
          <SampleBadge />
        </CardHeader>
        <CardContent>
          <LatestOrders />
        </CardContent>
      </Card>
    </div>
  );
}
