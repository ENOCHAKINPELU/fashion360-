import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";

const PAGE_SIZE = 10;

// Public — the designer's published review list (Part 23).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const sort = req.nextUrl.searchParams.get("sort") ?? "recent";

    const orderBy = sort === "highest" ? { overallRating: "desc" as const } : sort === "lowest" ? { overallRating: "asc" as const } : { createdAt: "desc" as const };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { businessId: id, status: "PUBLISHED" },
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          customerProfile: { select: { username: true, profilePhotoUrl: true } },
          ratings: true,
          photos: { where: { isPublic: true } },
          response: true,
        },
      }),
      prisma.review.count({ where: { businessId: id, status: "PUBLISHED" } }),
    ]);

    return NextResponse.json({ reviews, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
