import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { investigatePayment } from "@/lib/admin-payments";
import { prisma } from "@/lib/prisma";

const schema = z.object({ note: z.string().trim().min(1, "A note is required") });

// Adds an admin-only note (OrderNoteCategory.ADMIN) to the order behind this
// payment — reuses Phase 6's addAdminOrderNote rather than a second,
// Payment-scoped notes system.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const { note } = schema.parse(await req.json());

    const orderNote = await investigatePayment(prisma, { paymentId: id, note, actorId: session.user.id });

    return NextResponse.json({ note: orderNote });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
