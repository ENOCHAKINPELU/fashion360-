import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/shared/components/user-avatar";
import { ManualSessionForm } from "@/features/measurements/components/manual-session-form";
import { PhotoSessionForm } from "@/features/measurements/components/photo-session-form";

export default async function MeasurementSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const measurementSession = await prisma.measurementSession.findFirst({
    where: { id, businessId },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
      template: { include: { fields: { include: { measurementType: true }, orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!measurementSession) notFound();

  if (measurementSession.status === "COMPLETED" && measurementSession.resultMeasurementId) {
    const { redirect } = await import("next/navigation");
    redirect(`/dashboard/measurements/${measurementSession.resultMeasurementId}`);
  }

  const types = measurementSession.template
    ? measurementSession.template.fields.map((f) => f.measurementType)
    : await prisma.measurementType.findMany({ where: { businessId }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  const requiredKeys = new Set(
    measurementSession.template ? measurementSession.template.fields.filter((f) => f.required).map((f) => f.measurementType.key) : []
  );

  const serialized = JSON.parse(JSON.stringify(measurementSession));

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/measurements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ChevronLeft className="size-4" /> Back to Measurements
      </Link>

      <div className="flex items-center gap-3">
        <UserAvatar
          name={`${measurementSession.customer.firstName} ${measurementSession.customer.lastName}`}
          image={measurementSession.customer.profilePhotoUrl}
          className="size-11"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {measurementSession.customer.firstName} {measurementSession.customer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {measurementSession.method === "PHOTO_ESTIMATION" ? "Photo-based estimation session" : "Manual measurement session"}
            {measurementSession.template ? ` · ${measurementSession.template.name} template` : ""}
          </p>
        </div>
      </div>

      {measurementSession.method === "PHOTO_ESTIMATION" ? (
        <PhotoSessionForm session={serialized} />
      ) : (
        <ManualSessionForm session={serialized} types={types} requiredKeys={requiredKeys} />
      )}
    </div>
  );
}
