import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DesignProjectWorkspaceClient } from "@/features/design-projects/components/design-project-workspace-client";

export default async function DesignProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const project = await prisma.designPreview.findFirst({ where: { id, businessId, orderId: null } });
  if (!project) notFound();

  const [customerProfile, brief, references, versions, revisionRequests, comments, activities, approvalRecord, serviceRequest, designers] =
    await Promise.all([
      project.customerProfileId
        ? prisma.customerProfile.findUnique({
            where: { id: project.customerProfileId },
            select: { id: true, user: { select: { name: true, email: true, image: true } } },
          })
        : null,
      prisma.designBrief.findUnique({ where: { previewId: id } }),
      prisma.designReference.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } }),
      prisma.designVersion.findMany({
        where: { previewId: id },
        orderBy: { versionNumber: "desc" },
        include: { model: true, textures: true },
      }),
      prisma.designRevisionRequest.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" } }),
      prisma.designComment.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } }),
      prisma.designActivity.findMany({ where: { previewId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.designApprovalRecord.findUnique({ where: { previewId: id } }),
      project.serviceRequestId ? prisma.serviceRequest.findUnique({ where: { id: project.serviceRequestId } }) : null,
      prisma.user.findMany({ where: { businessId, role: { in: ["OWNER", "STAFF"] } }, select: { id: true, name: true } }),
    ]);

  const [quotation, business] = await Promise.all([
    prisma.quotation.findFirst({
      where: { designPreviewId: id, status: { notIn: ["DECLINED", "CANCELLED", "ARCHIVED"] } },
      select: { id: true, quotationNumber: true, status: true, orderId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { currency: true } }),
  ]);

  const bundle = {
    project,
    customerProfile,
    brief,
    references,
    versions,
    revisionRequests,
    comments,
    activities,
    approvalRecord,
    serviceRequest,
    designers,
    quotation,
    currency: business.currency,
  };

  return <DesignProjectWorkspaceClient bundle={JSON.parse(JSON.stringify(bundle))} />;
}
