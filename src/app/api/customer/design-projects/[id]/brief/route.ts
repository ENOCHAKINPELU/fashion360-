import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { designBriefSchema } from "@/lib/validations/design-project";
import { loadCustomerDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

// Part 7: editable by the customer until the project moves out of Draft /
// Design In Progress — once the designer has submitted a version for
// review, the brief that shaped it is frozen so history stays meaningful.
const EDITABLE_STATUSES = new Set(["DRAFT", "DESIGN_IN_PROGRESS"]);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);
    if (!EDITABLE_STATUSES.has(project.status)) {
      throw new ApiError(400, "Your design brief is locked now that your designer is working on it");
    }

    const data = designBriefSchema.parse(await req.json());

    const brief = await prisma.$transaction(async (tx) => {
      const updated = await tx.designBrief.upsert({
        where: { previewId: id },
        create: { previewId: id, ...data },
        update: data,
      });
      await logDesignActivity(tx, {
        previewId: id,
        businessId: project.businessId,
        type: "DESIGNER_UPDATED",
        title: "Customer updated the design brief",
        actorType: "CUSTOMER",
      });
      await notifyDesignEvent(tx, {
        businessId: project.businessId,
        assignedDesignerId: project.assignedDesignerId,
        title: "Design brief updated",
        body: `The customer updated their brief for ${project.name}.`,
        type: "info",
      });
      return updated;
    });

    return NextResponse.json({ brief });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
