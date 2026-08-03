import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import type { Prisma, PayoutStatus } from "@prisma/client";

const PAGE_SIZE = 20;
const VALID_STATUSES = new Set<PayoutStatus>(["NOT_ELIGIBLE", "ELIGIBLE", "PROCESSING", "PAID", "FAILED"]);

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const statusParam = req.nextUrl.searchParams.get("status");
    const status = statusParam && VALID_STATUSES.has(statusParam as PayoutStatus) ? (statusParam as PayoutStatus) : null;

    const where: Prisma.PayoutWhereInput = { businessId, ...(status ? { status } : {}) };

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { order: { select: { id: true, orderCode: true, customer: { select: { firstName: true, lastName: true } } } } },
      }),
      prisma.payout.count({ where }),
    ]);

    return NextResponse.json({ payouts, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
