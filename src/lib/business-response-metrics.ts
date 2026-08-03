import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 7/22's "Response Time" / "Response Rate" — always computed live from
// real ServiceRequestResponse timestamps, never stored or estimated. A
// business with zero received requests has no rate/time to report, which
// callers should render as an honest "No data yet" rather than 0%/0h.
export async function getBusinessResponseMetrics(db: Db, businessId: string) {
  const requests = await db.serviceRequest.findMany({
    where: { businessId, status: { notIn: ["DRAFT"] } },
    select: { createdAt: true, businessRespondedAt: true },
  });

  const total = requests.length;
  const responded = requests.filter((r) => r.businessRespondedAt);

  if (total === 0) {
    return { totalRequests: 0, responseRate: null as number | null, avgResponseTimeHours: null as number | null };
  }

  const responseRate = Math.round((responded.length / total) * 100);

  const avgResponseTimeHours =
    responded.length === 0
      ? null
      : responded.reduce((sum, r) => sum + (r.businessRespondedAt!.getTime() - r.createdAt.getTime()), 0) /
        responded.length /
        (1000 * 60 * 60);

  return {
    totalRequests: total,
    responseRate,
    avgResponseTimeHours: avgResponseTimeHours != null ? Math.round(avgResponseTimeHours * 10) / 10 : null,
  };
}
