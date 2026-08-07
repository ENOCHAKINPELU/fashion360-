import { prisma } from "@/lib/prisma";
import { AdminVerificationsClient } from "@/features/admin/components/admin-verifications-client";

// The "Verified" trust badge shown across the app has always read
// BusinessVerification.status, but there was no admin page to ever set it
// to VERIFIED except a raw database edit. This closes that gap.
export default async function AdminVerificationsPage() {
  const verifications = await prisma.businessVerification.findMany({
    where: { status: "PENDING" },
    orderBy: { submittedAt: "asc" },
    include: { business: { select: { id: true, name: true, email: true, phone: true, businessType: true, createdAt: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Verifications</h1>
        <p className="text-sm text-muted-foreground">Review business verification requests. Verified businesses get a trust badge and rank higher in discovery.</p>
      </div>
      <AdminVerificationsClient verifications={JSON.parse(JSON.stringify(verifications))} />
    </div>
  );
}
