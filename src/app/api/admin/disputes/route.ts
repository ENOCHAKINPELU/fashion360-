import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import type { Prisma, DisputeStatus } from "@prisma/client";

const PAGE_SIZE = 30;
const VALID_STATUSES = new Set<DisputeStatus>(["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"]);

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const statusParam = req.nextUrl.searchParams.get("status");
    const status = statusParam && VALID_STATUSES.has(statusParam as DisputeStatus) ? (statusParam as DisputeStatus) : null;

    const where: Prisma.DisputeWhereInput = status ? { status } : {};

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          business: { select: { id: true, name: true } },
          order: { select: { id: true, orderCode: true } },
          customer: { select: { firstName: true, lastName: true } },
          resolution: true,
        },
      }),
      prisma.dispute.count({ where }),
    ]);

    return NextResponse.json({ disputes, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
