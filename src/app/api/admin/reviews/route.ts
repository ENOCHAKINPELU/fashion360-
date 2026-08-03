import { NextRequest, NextResponse } from "next/server";
import type { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";

const VALID_STATUSES = new Set<ReviewStatus>(["PENDING_MODERATION", "PUBLISHED", "REJECTED", "FLAGGED", "HIDDEN", "REMOVED"]);

// Part 32: the moderation queue — flagged reviews first by default.
export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const statusParam = req.nextUrl.searchParams.get("status");
    const status = statusParam && VALID_STATUSES.has(statusParam as ReviewStatus) ? (statusParam as ReviewStatus) : null;

    const reviews = await prisma.review.findMany({
      where: status ? { status } : { status: { in: ["FLAGGED", "PENDING_MODERATION"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { id: true, name: true } },
        customerProfile: { select: { id: true, username: true } },
        reports: { where: { status: "PENDING" } },
        deletionRequest: true,
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
