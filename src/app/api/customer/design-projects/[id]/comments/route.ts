import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerDesignProject } from "@/lib/design-project";
import { logDesignActivity } from "@/lib/design-activity";
import { notifyDesignEvent } from "@/lib/design-notifications";

const commentSchema = z.object({
  body: z.string().trim().min(1),
  versionId: z.string().optional(),
});

// General reply thread — mainly used to answer a designer's
// "ask-clarification" response on a change request (Part 11).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const project = await loadCustomerDesignProject(id, profile.id);
    const data = commentSchema.parse(await req.json());

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.designComment.create({
        data: {
          previewId: id,
          businessId: project.businessId,
          versionId: data.versionId || null,
          authorType: "CUSTOMER",
          customerProfileId: profile.id,
          body: data.body,
        },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId: project.businessId,
        type: "COMMENT_ADDED",
        title: "Customer added a comment",
        description: data.body.slice(0, 140),
        actorType: "CUSTOMER",
      });

      await notifyDesignEvent(tx, {
        businessId: project.businessId,
        assignedDesignerId: project.assignedDesignerId,
        title: "New comment from customer",
        body: `${project.name}: "${data.body.slice(0, 100)}"`,
      });

      return created;
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
