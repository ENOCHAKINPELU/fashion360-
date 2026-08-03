import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { resolveReviewDeletionRequest } from "@/lib/reviews";

const schema = z.object({ approve: z.boolean(), resolutionNote: z.string().trim().max(1000).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const data = schema.parse(await req.json());

    const request = await prisma.$transaction(
      (tx) => resolveReviewDeletionRequest(tx, { requestId: id, approve: data.approve, resolutionNote: data.resolutionNote, resolvedById: session.user.id }),
      { timeout: 20000 }
    );
    return NextResponse.json({ request });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
