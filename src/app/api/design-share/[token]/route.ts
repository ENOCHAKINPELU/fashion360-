import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { getShareOrThrow } from "@/lib/design-share";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

// Public, token-authenticated bundle for the customer design review page.
// Deliberately hand-picks fields rather than reusing the staff detail
// include, so private/internal data (other share tokens, private notes,
// full activity log) can never leak through this route.
//
// DesignVersion is fetched with an explicit `select` (not a bare `include`)
// specifically so `internalNotes` — marked in the schema as never safe for a
// customer-facing response — can't leak here just because a future field
// gets added to the model.
const SHARE_VERSION_SELECT = {
  id: true,
  versionNumber: true,
  status: true,
  previewType: true,
  previewImageUrl: true,
  changesSummary: true,
  createdAt: true,
  createdBy: { select: { name: true } },
  customization: true,
  model: true,
  textures: { include: { fabricLibraryItem: true } },
} as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getShareOrThrow(token);
    const preview = share.preview;
    // Share tokens only ever exist for the legacy order-anchored flow — a
    // Phase 5 pre-order Design Project is reviewed through the authenticated
    // /api/customer/design-projects routes instead, never a public token.
    if (!preview.order) throw new ApiError(404, "This design preview link is invalid");

    const [versions, comments, revisionRequests] = await Promise.all([
      prisma.designVersion.findMany({
        where: { previewId: preview.id },
        orderBy: { versionNumber: "desc" },
        select: SHARE_VERSION_SELECT,
      }),
      prisma.designComment.findMany({
        where: { previewId: preview.id },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      }),
      prisma.designRevisionRequest.findMany({ where: { previewId: preview.id }, orderBy: { createdAt: "desc" } }),
    ]);

    await prisma.$transaction(async (tx) => {
      await tx.designShare.update({
        where: { id: share.id },
        data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
      });
      await tx.designViewSession.create({
        data: {
          previewId: preview.id,
          businessId: preview.businessId,
          viewerType: "CUSTOMER",
          shareId: share.id,
          ipAddress: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent"),
        },
      });

      if (!preview.firstViewedAt) {
        await tx.designPreview.update({
          where: { id: preview.id },
          data: {
            firstViewedAt: new Date(),
            status: preview.status === "SENT_FOR_REVIEW" ? "UNDER_CUSTOMER_REVIEW" : preview.status,
          },
        });
        await logDesignActivity(tx, {
          previewId: preview.id,
          businessId: preview.businessId,
          type: "CUSTOMER_VIEWED",
          title: "Customer viewed the design",
          actorType: "CUSTOMER",
        });
        await notifyDesignEvent(tx, {
          businessId: preview.businessId,
          orderId: preview.orderId,
          title: "Customer viewed design",
          body: `${preview.name} was viewed by the customer for the first time.`,
        });
      } else if (preview.status === "SENT_FOR_REVIEW") {
        await tx.designPreview.update({ where: { id: preview.id }, data: { status: "UNDER_CUSTOMER_REVIEW" } });
      }
    });

    return NextResponse.json({
      preview: {
        id: preview.id,
        previewCode: preview.previewCode,
        name: preview.name,
        status: preview.status,
        previewType: preview.previewType,
        latestVersionNumber: preview.latestVersionNumber,
        revisionCount: preview.revisionCount,
        measurementSnapshot: preview.order.measurementSnapshot,
        business: preview.business,
        customer: preview.customer,
        order: preview.order,
      },
      versions,
      comments,
      revisionRequests,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
