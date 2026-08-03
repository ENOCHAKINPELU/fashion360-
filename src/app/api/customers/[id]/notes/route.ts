import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customerNoteSchema } from "@/lib/validations/customer";
import { logCustomerActivity } from "@/lib/customer-activity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const { body } = customerNoteSchema.parse(await req.json());

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.customerNote.create({
        data: { customerId: id, body, authorId: session.user.id },
        include: { author: { select: { name: true } } },
      });

      await logCustomerActivity(tx, {
        customerId: id,
        businessId,
        type: "NOTE_ADDED",
        title: "Note added",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
