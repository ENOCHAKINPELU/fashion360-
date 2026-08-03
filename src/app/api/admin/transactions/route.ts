import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import type { Prisma, FinancialTransactionType } from "@prisma/client";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const typeParam = req.nextUrl.searchParams.get("type");
    const businessId = req.nextUrl.searchParams.get("businessId");

    const where: Prisma.FinancialTransactionWhereInput = {
      ...(typeParam ? { type: typeParam as FinancialTransactionType } : {}),
      ...(businessId ? { businessId } : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { business: { select: { id: true, name: true } } },
      }),
      prisma.financialTransaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
