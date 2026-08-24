import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { addAdminOrderNote } from "@/lib/admin-orders";
import { prisma } from "@/lib/prisma";

const schema = z.object({ body: z.string().trim().min(1, "A note cannot be empty") });

// [id] is Order.id. Always writes category ADMIN (see lib/admin-orders.ts) —
// the request body has no `category` field, matching the brief's single-
// purpose "Internal Admin notes."
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const { body } = schema.parse(await req.json());

    const note = await addAdminOrderNote(prisma, { orderId: id, body, actorId: session.user.id });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
