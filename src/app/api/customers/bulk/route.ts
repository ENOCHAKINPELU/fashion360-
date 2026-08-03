import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customerBulkActionSchema } from "@/lib/validations/customer";
import { logCustomerActivity } from "@/lib/customer-activity";

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { ids, action, tagId, status } = customerBulkActionSchema.parse(await req.json());

    const scoped = await prisma.customer.findMany({ where: { id: { in: ids }, businessId }, select: { id: true } });
    const scopedIds = scoped.map((c) => c.id);
    if (scopedIds.length === 0) throw new ApiError(404, "No matching customers found");

    await prisma.$transaction(async (tx) => {
      if (action === "archive" || action === "unarchive") {
        const isArchiving = action === "archive";
        await tx.customer.updateMany({
          where: { id: { in: scopedIds } },
          data: { isArchived: isArchiving, archivedAt: isArchiving ? new Date() : null },
        });
      } else if (action === "delete") {
        await tx.customer.deleteMany({ where: { id: { in: scopedIds } } });
        return;
      } else if (action === "tag") {
        if (!tagId) throw new ApiError(400, "tagId is required for the tag action");
        for (const id of scopedIds) {
          await tx.customer.update({ where: { id }, data: { tags: { connect: { id: tagId } } } });
        }
      } else if (action === "status") {
        if (!status) throw new ApiError(400, "status is required for the status action");
        await tx.customer.updateMany({ where: { id: { in: scopedIds } }, data: { status } });
      }

      for (const id of scopedIds) {
        await logCustomerActivity(tx, {
          customerId: id,
          businessId,
          type: "STATUS_CHANGED",
          title: `Bulk action: ${action}`,
          actorId: session.user.id,
        });
      }
    });

    return NextResponse.json({ ok: true, count: scopedIds.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
