import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 30;

// Business staff see only their own business's audit trail; SUPER_ADMIN
// (the only role requireBusinessContext lets through without a businessId
// requirement being meaningful here) sees the platform-wide trail by
// omitting the businessId filter.
export async function GET(req: NextRequest) {
  try {
    const { session, businessId } = await requireBusinessContext();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));

    const where: Prisma.AuditLogWhereInput = session.user.role === "SUPER_ADMIN" ? {} : { businessId };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { name: true, email: true } }, business: { select: { name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
