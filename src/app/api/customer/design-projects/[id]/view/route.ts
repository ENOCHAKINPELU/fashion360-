import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

// Part 26: "Customer Views Design -> notify business" — fires once per
// project on first view only, mirroring the legacy DesignShare token flow's
// firstViewedAt behavior.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);

    await prisma.$transaction(async (tx) => {
      await tx.designViewSession.create({
        data: {
          previewId: id,
          businessId: project.businessId,
          viewerType: "CUSTOMER",
          viewerId: profile.id,
          ipAddress: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent"),
        },
      });

      if (!project.firstViewedAt) {
        await tx.designPreview.update({ where: { id }, data: { firstViewedAt: new Date() } });
        await logDesignActivity(tx, {
          previewId: id,
          businessId: project.businessId,
          type: "CUSTOMER_VIEWED",
          title: "Customer viewed the design",
          actorType: "CUSTOMER",
        });
        await notifyDesignEvent(tx, {
          businessId: project.businessId,
          assignedDesignerId: project.assignedDesignerId,
          title: "Customer viewed design",
          body: `${project.name} was viewed by the customer for the first time.`,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
