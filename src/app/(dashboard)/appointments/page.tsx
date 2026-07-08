import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppointmentsClient } from "./appointments-client";

export default async function AppointmentsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [appointments, customers] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId },
      orderBy: { startTime: "asc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      where: { businessId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppointmentsClient appointments={JSON.parse(JSON.stringify(appointments))} customers={customers} />
  );
}
