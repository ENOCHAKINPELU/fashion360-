import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/shared/components/user-avatar";
import { MeasurementStatusBadge, MeasurementSourceBadge } from "@/features/measurements/components/measurement-status-badge";
import { MeasurementValuesPanel } from "@/features/measurements/components/measurement-values-panel";
import { MeasurementQuickActions } from "@/features/measurements/components/measurement-quick-actions";
import { MeasurementNotesPanel } from "@/features/measurements/components/measurement-notes-panel";
import { MeasurementFilesPanel } from "@/features/measurements/components/measurement-files-panel";
import { MeasurementHistoryTimeline } from "@/features/measurements/components/measurement-history-timeline";
import { formatDate } from "@/lib/utils";

export default async function MeasurementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const measurement = await prisma.measurement.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      profile: true,
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      files: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  if (!measurement) notFound();

  const types = await prisma.measurementType.findMany({ where: { businessId }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const fieldLabels = Object.fromEntries(types.map((t) => [t.key, t.label]));

  const serialized = JSON.parse(JSON.stringify(measurement));

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/measurements/profiles/${measurement.profileId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ChevronLeft className="size-4" /> Back to {measurement.profile.name}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={`${measurement.customer.firstName} ${measurement.customer.lastName}`}
            image={measurement.customer.profilePhotoUrl}
            className="size-11"
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {measurement.customer.firstName} {measurement.customer.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {measurement.profile.name} · {formatDate(measurement.createdAt)}
              {measurement.createdBy?.name ? ` · by ${measurement.createdBy.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <MeasurementSourceBadge source={measurement.source} />
          <MeasurementStatusBadge status={measurement.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(measurement.frontImageUrl || measurement.sideImageUrl) && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Uploaded Photos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {measurement.frontImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={measurement.frontImageUrl} alt="Front" className="aspect-[3/4] w-full rounded-xl object-cover" />
                )}
                {measurement.sideImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={measurement.sideImageUrl} alt="Side" className="aspect-[3/4] w-full rounded-xl object-cover" />
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Measurements</CardTitle>
            </CardHeader>
            <CardContent>
              <MeasurementValuesPanel measurement={serialized} types={types} />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm print:hidden">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <MeasurementQuickActions measurementId={measurement.id} customerId={measurement.customerId} />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm print:hidden">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <MeasurementNotesPanel measurementId={measurement.id} notes={serialized.notes} />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm print:hidden">
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <MeasurementFilesPanel measurementId={measurement.id} files={serialized.files} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 print:hidden">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <MeasurementHistoryTimeline history={serialized.history} fieldLabels={fieldLabels} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
