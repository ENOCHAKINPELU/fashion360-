import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { loadBusinessDesignProject, submitDesignVersionForReview } from "@/lib/design-project";

// Part 10: the explicit "send to customer" action — separate from version
// creation so a designer can draft/edit a version before the customer sees
// it. isRevision is true whenever the project has already been through at
// least one review cycle (i.e. this isn't the project's very first version).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const { id, versionId } = await params;
    const { businessId, session } = await requireBusinessContext();
    await loadBusinessDesignProject(id, businessId);

    const version = await prisma.designVersion.findUnique({ where: { id: versionId } });
    if (!version || version.previewId !== id) throw new ApiError(404, "Version not found");
    if (version.status === "APPROVED") throw new ApiError(400, "This version is already approved and locked");

    const isRevision = version.versionNumber > 1;
    const updated = await prisma.$transaction((tx) =>
      submitDesignVersionForReview(tx, { previewId: id, businessId, versionId, actorId: session.user.id, isRevision })
    );

    return NextResponse.json({ project: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
