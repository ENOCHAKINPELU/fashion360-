import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { findActiveGrant } from "@/lib/measurement-access";
import { logMeasurementAccess } from "@/lib/measurement-access-log";
import { valuesForDisplay } from "@/lib/measurement-conversion";
import { MEASUREMENT_FIELDS } from "@/lib/validations/measurement";
import { CorrectionRequestActions } from "@/features/business/components/correction-request-actions";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_REVIEW: "bg-warning-soft text-warning",
  CONFIRMED: "bg-success-soft text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export default async function BusinessMeasurementProfileDetailPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const grant = await findActiveGrant(prisma, { measurementProfileId: profileId, businessId });
  if (!grant) notFound();

  const profile = await prisma.passportMeasurementProfile.findUnique({
    where: { id: profileId },
    include: {
      currentVersion: true,
      customerProfile: { include: { user: { select: { name: true, email: true } } } },
      versions: { orderBy: { versionNumber: "desc" } },
      correctionRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!profile) notFound();

  await logMeasurementAccess(prisma, { grantId: grant.id, viewedById: session!.user.id });

  const displayValues = profile.currentVersion ? valuesForDisplay(profile.currentVersion.values as Record<string, number>, profile.preferredUnit) : {};

  return (
    <div className="space-y-6">
      <Link href="/dashboard/customer-measurements" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to Customer Measurements
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{profile.customerProfile.user.name ?? profile.customerProfile.user.email}</p>
        </div>
        <Badge className={STATUS_STYLES[profile.status] ?? STATUS_STYLES.DRAFT}>{profile.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardContent>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Current Values (Version {profile.currentVersion?.versionNumber ?? 0})
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                {MEASUREMENT_FIELDS.filter((f) => displayValues[f.key] != null).map((f) => (
                  <div key={f.key}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="font-medium text-foreground">
                      {displayValues[f.key]} {profile.preferredUnit === "METRIC" ? "cm" : "in"}
                    </dd>
                  </div>
                ))}
              </dl>
              {profile.currentVersion?.notes && <p className="mt-3 text-sm text-muted-foreground">{profile.currentVersion.notes}</p>}
            </CardContent>
          </Card>

          {profile.correctionRequests.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardContent>
                <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Correction Requests</p>
                <ul className="space-y-2">
                  {profile.correctionRequests.map((c) => (
                    <li key={c.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{c.fieldKey}</span>
                        <Badge variant="outline">{c.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Requested: {c.requestedValue} cm ({c.reason})</p>
                      {c.status === "PENDING" && <CorrectionRequestActions correctionId={c.id} />}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Version History</p>
            <ul className="space-y-3">
              {profile.versions.map((v) => (
                <li key={v.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm text-foreground">
                      Version {v.versionNumber} · {v.status}
                    </p>
                    {v.reason && <p className="text-xs text-muted-foreground">{v.reason}</p>}
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(v.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
