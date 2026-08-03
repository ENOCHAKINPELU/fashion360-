import Link from "next/link";
import { UserCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/shared/components/empty-state";
import { UserAvatar } from "@/shared/components/user-avatar";
import { Button } from "@/components/ui/button";

export async function CustomersWithoutMeasurementsWidget({ businessId }: { businessId: string }) {
  const withMeasurements = await prisma.measurement.findMany({
    where: { businessId },
    distinct: ["customerId"],
    select: { customerId: true },
  });

  const customers = await prisma.customer.findMany({
    where: { businessId, isArchived: false, id: { notIn: withMeasurements.map((m) => m.customerId) } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
  });

  if (customers.length === 0) {
    return <EmptyState icon={UserCheck} title="Every customer has measurements on file" className="border-none py-8" />;
  }

  return (
    <ul className="space-y-2.5">
      {customers.map((c) => (
        <li key={c.id} className="flex items-center gap-3">
          <UserAvatar name={`${c.firstName} ${c.lastName}`} image={c.profilePhotoUrl} className="size-8" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {c.firstName} {c.lastName}
          </span>
          <Link href={`/dashboard/measurements?customerId=${c.id}`}>
            <Button size="sm" variant="outline">
              Add
            </Button>
          </Link>
        </li>
      ))}
    </ul>
  );
}
