import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { customerApproveSchema } from "@/lib/validations/design-project";
import { loadCustomerDesignProject } from "@/lib/design-project";
import { finalizeDesignDecision } from "@/lib/design-approval";

// Part 13/14: the one explicit "Approve Final Design" action — requires the
// literal confirm:true flag from the UI's confirmation dialog, and always
// routes through finalizeDesignDecision so locking/versioning/audit-trail
// invariants (Part 15/16) are identical to every other approval path.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);
    if (project.status !== "CUSTOMER_REVIEW") {
      throw new ApiError(400, "There's no design version currently awaiting your approval");
    }

    customerApproveSchema.parse(await req.json());

    const activeVersion = await prisma.designVersion.findFirst({ where: { previewId: id, status: "ACTIVE" } });
    if (!activeVersion) throw new ApiError(400, "There is no version currently awaiting review");

    const updated = await prisma.$transaction((tx) =>
      finalizeDesignDecision(tx, {
        previewId: id,
        versionId: activeVersion.id,
        businessId: project.businessId,
        orderId: project.orderId,
        measurementProfileId: project.measurementProfileId,
        decision: "APPROVED",
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
        recordedByType: "CUSTOMER",
        customerProfileId: profile.id,
      })
    );

    return NextResponse.json({ project: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
