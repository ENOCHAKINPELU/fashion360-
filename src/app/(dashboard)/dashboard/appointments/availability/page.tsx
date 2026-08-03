import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOrCreateAvailability } from "@/lib/availability";
import { ensureDefaultAppointmentTypes } from "@/lib/appointment-types";
import { AvailabilityForm } from "@/features/appointments/components/availability-form";
import { BlockedDatesManager } from "@/features/appointments/components/blocked-dates-manager";
import { AppointmentTypesManager } from "@/features/appointments/components/appointment-types-manager";

export default async function AvailabilitySettingsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  await ensureDefaultAppointmentTypes(prisma, businessId);

  const [availability, blockedDates, types] = await Promise.all([
    getOrCreateAvailability(businessId),
    prisma.blockedDate.findMany({ where: { businessId }, orderBy: { date: "asc" } }),
    prisma.appointmentType.findMany({ where: { businessId }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/appointments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to Appointments
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Availability Settings</h1>
        <p className="text-sm text-muted-foreground">
          Working hours come from Business Settings. Configure booking-specific rules here.
        </p>
      </div>

      <Tabs defaultValue="availability">
        <TabsList>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="blocked">Blocked Dates</TabsTrigger>
          <TabsTrigger value="types">Appointment Types</TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-none shadow-sm">
          <CardContent>
            <TabsContent value="availability">
              <AvailabilityForm availability={JSON.parse(JSON.stringify(availability))} />
            </TabsContent>
            <TabsContent value="blocked">
              <BlockedDatesManager blockedDates={JSON.parse(JSON.stringify(blockedDates))} />
            </TabsContent>
            <TabsContent value="types">
              <AppointmentTypesManager types={types} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
