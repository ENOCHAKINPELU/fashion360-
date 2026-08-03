import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DESIGN_PREVIEW_DETAIL_INCLUDE } from "@/app/api/design-previews/[id]/route";
import { DesignWorkspaceClient } from "@/features/design-studio/components/design-workspace-client";
import type { DesignPreviewDetailData } from "@/features/design-studio/types";

export default async function DesignWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const businessId = session!.user.businessId!;

  const preview = await prisma.designPreview.findFirst({
    where: { id, businessId },
    include: DESIGN_PREVIEW_DETAIL_INCLUDE,
  });

  // A Phase 5 pre-order Design Project (orderId null) belongs at
  // /dashboard/design-projects/[id] instead — this workspace assumes an
  // Order throughout.
  if (!preview || !preview.orderId) notFound();

  const serialized = JSON.parse(JSON.stringify(preview)) as DesignPreviewDetailData;

  return <DesignWorkspaceClient preview={serialized} />;
}
