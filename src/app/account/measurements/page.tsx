import { Ruler } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getLinkedCustomerRecords } from "@/lib/customer-linked-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { MeasurementVaultManager } from "@/features/customer-account/components/measurement-vault-manager";
import { formatDate } from "@/lib/utils";

function humanizeKey(key: string) {
  return key.replace(/([A-Z])/g, " $1").trim();
}

export default async function CustomerMeasurementsPage() {
  const { profile } = await requireCustomerContext();
  const linked = await getLinkedCustomerRecords(profile.id);
  const linkedByCustomerId = new Map(linked.map((l) => [l.customerId, l]));

  const [vaultProfiles, businessProfiles, pendingAccessRequests] = await Promise.all([
    prisma.passportMeasurementProfile.findMany({
      where: { customerProfileId: profile.id, isArchived: false },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      include: {
        currentVersion: true,
        accessGrants: {
          where: { revokedAt: null },
          include: { business: { select: { id: true, name: true } } },
        },
      },
    }),
    linked.length
      ? prisma.measurementProfile.findMany({
          where: { customerId: { in: linked.map((l) => l.customerId) }, isArchived: false },
          orderBy: { updatedAt: "desc" },
          include: { measurements: { orderBy: { createdAt: "desc" }, take: 1 } },
        })
      : Promise.resolve([]),
    prisma.measurementAccessRequest.findMany({
      where: { customerProfileId: profile.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { business: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Measurements</h1>
        <p className="text-sm text-muted-foreground">
          Your own measurement vault, plus what businesses you work with have on file for you.
        </p>
      </div>

      <MeasurementVaultManager
        profiles={vaultProfiles.map((p) => ({
          ...p,
          updatedAt: p.updatedAt.toISOString(),
          currentVersion: p.currentVersion
            ? { ...p.currentVersion, values: p.currentVersion.values as Record<string, number>, createdAt: p.currentVersion.createdAt.toISOString() }
            : null,
          accessGrants: p.accessGrants.map((g) => ({ id: g.id, scope: g.scope, business: g.business })),
        }))}
        connectedBusinesses={linked.map((l) => ({ businessId: l.businessId, businessName: l.businessName }))}
        pendingAccessRequests={pendingAccessRequests.map((r) => ({ id: r.id, reason: r.reason ?? "", business: r.business, createdAt: r.createdAt.toISOString() }))}
      />

      <div className="space-y-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Measurements On File With Businesses</p>
        {businessProfiles.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="No Measurements On File"
            description="Measurement profiles a business takes for you will appear here, you'll always be able to see what's on file."
          />
        ) : (
          <div className="space-y-4">
            {businessProfiles.map((bp) => {
              const business = linkedByCustomerId.get(bp.customerId);
              const latest = bp.measurements[0];
              const entries = latest ? Object.entries(latest.values as Record<string, number>) : [];
              return (
                <Card key={bp.id} className="border-none shadow-sm">
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{bp.name}</p>
                        <p className="text-xs text-muted-foreground">{business?.businessName ?? "Unknown business"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {bp.isDefault && <Badge className="bg-accent-soft text-primary hover:bg-accent-soft">Default</Badge>}
                        <span className="text-xs text-muted-foreground">Updated {formatDate(bp.updatedAt)}</span>
                      </div>
                    </div>
                    {entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No measurement values recorded yet.</p>
                    ) : (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                        {entries.map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs text-muted-foreground capitalize">{humanizeKey(key)}</dt>
                            <dd className="font-medium text-foreground">
                              {value} {latest.unit === "METRIC" ? "cm" : "in"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
