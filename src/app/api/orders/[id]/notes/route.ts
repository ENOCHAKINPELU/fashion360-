import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { orderNoteSchema } from "@/lib/validations/order";
import { logOrderActivity } from "@/lib/order-activity";
import { getScopedOrder } from "@/app/api/orders/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    // ADMIN-category notes are Fashion360-admin-only — see schema.prisma's
    // OrderNoteCategory comment and ORDER_DETAIL_INCLUDE's same filter.
    const notes = await prisma.orderNote.findMany({
      where: { orderId: id, category: { not: "ADMIN" } },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedOrder(businessId, id);

    const data = orderNoteSchema.parse(await req.json());

    const note = await prisma.orderNote.create({
      data: { orderId: id, category: data.category, body: data.body, authorId: session.user.id },
      include: { author: { select: { name: true } } },
    });

    await logOrderActivity(prisma, {
      orderId: id,
      businessId,
      type: "NOTE_ADDED",
      title: "Note added",
      description: data.body.slice(0, 140),
      actorId: session.user.id,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
