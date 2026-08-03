import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import type { Prisma, RefundStatus } from "@prisma/client";

const PAGE_SIZE = 30;
const VALID_STATUSES = new Set<RefundStatus>(["PENDING", "SUCCESSFUL", "FAILED"]);

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const statusParam = req.nextUrl.searchParams.get("status");
    const status = statusParam && VALID_STATUSES.has(statusParam as RefundStatus) ? (statusParam as RefundStatus) : null;

    const where: Prisma.RefundWhereInput = status ? { status } : {};

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          business: { select: { id: true, name: true } },
          payment: { select: { id: true, orderId: true, currency: true, invoice: { select: { invoiceNumber: true } } } },
          processedBy: { select: { name: true } },
        },
      }),
      prisma.refund.count({ where }),
    ]);

    return NextResponse.json({ refunds, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
