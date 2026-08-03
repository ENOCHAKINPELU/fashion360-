import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/shared/components/user-avatar";
import { ProfileActions } from "@/features/measurements/components/profile-actions";
import { ProfileMeasurementsList } from "@/features/measurements/components/profile-measurements-list";

export default async function MeasurementProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const profile = await prisma.measurementProfile.findFirst({
    where: { id, businessId },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
      measurements: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!profile) notFound();

  const serialized = JSON.parse(JSON.stringify(profile));

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/customers/${profile.customer.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to {profile.customer.firstName} {profile.customer.lastName}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={`${profile.customer.firstName} ${profile.customer.lastName}`}
            image={profile.customer.profilePhotoUrl}
            className="size-11"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{profile.name}</h1>
              {profile.isDefault && <Badge className="bg-primary text-white hover:bg-primary">Default</Badge>}
              {profile.isArchived && (
                <Badge variant="outline" className="text-muted-foreground">
                  Archived
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.customer.firstName} {profile.customer.lastName} · {profile.measurements.length} measurement
              {profile.measurements.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/measurements?customerId=${profile.customer.id}&profileId=${profile.id}`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" /> New Measurement
          </Button>
        </Link>
      </div>

      <ProfileActions profileId={profile.id} name={profile.name} isDefault={profile.isDefault} isArchived={profile.isArchived} />

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Measurement History</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileMeasurementsList measurements={serialized.measurements} />
        </CardContent>
      </Card>
    </div>
  );
}
