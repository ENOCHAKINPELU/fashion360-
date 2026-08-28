import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { requestDisputeInformation } from "@/lib/admin-disputes";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  target: z.enum(["customer", "designer"]),
  message: z.string().trim().min(1, "A message is required"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const { target, message } = schema.parse(await req.json());

    const dispute = await requestDisputeInformation(prisma, { disputeId: id, target, message, actorId: session.user.id });

    return NextResponse.json({ dispute });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
