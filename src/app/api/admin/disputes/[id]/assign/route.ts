import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { assignDisputeToAdmin } from "@/lib/admin-disputes";
import { prisma } from "@/lib/prisma";

const schema = z.object({ adminId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const { adminId } = schema.parse(await req.json());

    const dispute = await assignDisputeToAdmin(prisma, { disputeId: id, adminId, actorId: session.user.id });

    return NextResponse.json({ dispute });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
