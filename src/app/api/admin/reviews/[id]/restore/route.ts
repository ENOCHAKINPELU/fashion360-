import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { moderateReview } from "@/lib/reviews";

const schema = z.object({ reason: z.string().trim().min(1, "A reason is required").max(1000) });

// Part 14/32: a thin, literal-spec-shaped alias over moderateReview's
// RESTORE action — kept as its own route since the spec lists it separately
// from POST /admin/reviews/:id/moderate.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const data = schema.parse(await req.json());

    const review = await prisma.$transaction(
      (tx) => moderateReview(tx, { reviewId: id, action: "RESTORE", reason: data.reason, actorId: session.user.id }),
      { timeout: 20000 }
    );
    return NextResponse.json({ review });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
