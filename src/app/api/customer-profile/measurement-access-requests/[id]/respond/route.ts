import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { measurementAccessRequestResponseSchema } from "@/lib/validations/measurement";
import { grantMeasurementAccess } from "@/lib/measurement-access";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

const STATUS_MAP = {
  allow: "ALLOWED",
  "allow-once": "ALLOWED_ONCE",
  "allow-until-completion": "ALLOWED_UNTIL_COMPLETION",
  decline: "DECLINED",
} as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, session } = await requireCustomerContext();
    const { id } = await params;
    const data = measurementAccessRequestResponseSchema.parse(await req.json());

    const request = await prisma.measurementAccessRequest.findUnique({ where: { id } });
    if (!request || request.customerProfileId !== profile.id) throw new ApiError(404, "Access request not found");
    if (request.status !== "PENDING") throw new ApiError(400, "This request has already been resolved");

    let measurementProfileId = data.measurementProfileId;
    if (data.action !== "decline") {
      if (!measurementProfileId) {
        const defaultProfile = await prisma.passportMeasurementProfile.findFirst({
          where: { customerProfileId: profile.id, isArchived: false },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        });
        if (!defaultProfile) throw new ApiError(400, "You don't have a measurement profile to share yet");
        measurementProfileId = defaultProfile.id;
      } else {
        const owned = await prisma.passportMeasurementProfile.findUnique({ where: { id: measurementProfileId } });
        if (!owned || owned.customerProfileId !== profile.id) throw new ApiError(404, "Measurement profile not found");
      }
    }

    const status = STATUS_MAP[data.action];
    // "Allow Once" gets a short, bounded window; "Allow" and "Allow Until
    // Service Completion" both stay open-ended for now (no background job
    // to auto-revoke on order completion yet) — distinguished in the UI by
    // the request's recorded status, not by a different expiry mechanism.
    const expiresAt = data.action === "allow-once" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.measurementAccessRequest.update({
        where: { id },
        data: { status, respondedAt: new Date() },
      });

      if (data.action !== "decline") {
        await grantMeasurementAccess(tx, {
          measurementProfileId: measurementProfileId!,
          scope: "SHARED_WITH_BUSINESS",
          businessId: request.businessId,
          grantedById: session.user.id,
          accessRequestId: id,
          expiresAt,
        });
      }

      await notifyBusinessOwners(tx, {
        businessId: request.businessId,
        title: data.action === "decline" ? "Measurement access request declined" : "Measurement access granted",
        body:
          data.action === "decline"
            ? "The customer declined your measurement access request."
            : "The customer granted access to their measurement profile.",
        type: data.action === "decline" ? "warning" : "success",
      });

      return result;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
