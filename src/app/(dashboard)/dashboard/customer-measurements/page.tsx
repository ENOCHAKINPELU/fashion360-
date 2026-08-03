import Link from "next/link";
import { Ruler, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { RequestMeasurementAccessButton } from "@/features/business/components/request-measurement-access-button";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_REVIEW: "bg-warning-soft text-warning",
  CONFIRMED: "bg-success-soft text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export default async function CustomerMeasurementsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [grants, connectedWithoutAccess] = await Promise.all([
    prisma.measurementAccessGrant.findMany({
      where: { businessId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { grantedAt: "desc" },
      include: {
        measurementProfile: { include: { currentVersion: true, customerProfile: { include: { user: { select: { name: true, email: true } } } } } },
      },
    }),
    prisma.businessCustomerRelationship.findMany({
      where: {
        businessId,
        status: "ACTIVE",
        customerProfile: { measurementProfiles: { none: { accessGrants: { some: { businessId, revokedAt: null } } } } },
      },
      include: { customerProfile: { include: { user: { select: { name: true, email: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customer Measurements</h1>
        <p className="text-sm text-muted-foreground">Customers who've granted your business access to their Measurement Vault.</p>
      </div>

      {grants.length === 0 ? (
        <EmptyState icon={Ruler} title="No Measurement Requests" description="Customers will appear here when measurement access is granted." />
      ) : (
        <div className="space-y-2">
          {grants.map((g) => (
            <Link key={g.id} href={`/dashboard/customer-measurements/${g.measurementProfileId}`}>
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {g.measurementProfile.customerProfile.user.name ?? g.measurementProfile.customerProfile.user.email}
                      </p>
                      <Badge className={STATUS_STYLES[g.measurementProfile.status] ?? STATUS_STYLES.DRAFT}>{g.measurementProfile.status}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.measurementProfile.name} · Granted {formatDate(g.grantedAt)}
                      {g.expiresAt ? ` · Expires ${formatDate(g.expiresAt)}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {connectedWithoutAccess.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Connected Customers Without Access</p>
          <div className="space-y-2">
            {connectedWithoutAccess.map((rel) => (
              <Card key={rel.id} className="border-none shadow-sm">
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{rel.customerProfile.user.name ?? rel.customerProfile.user.email}</p>
                    <p className="text-xs text-muted-foreground">No measurement access yet</p>
                  </div>
                  <RequestMeasurementAccessButton customerProfileId={rel.customerProfileId} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
