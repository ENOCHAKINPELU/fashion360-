import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));

    const customer = await prisma.customer.findFirst({ where: { id, businessId }, select: { id: true } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const [activities, total] = await Promise.all([
      prisma.customerActivity.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { actor: { select: { name: true } } },
      }),
      prisma.customerActivity.count({ where: { customerId: id } }),
    ]);

    return NextResponse.json({
      activities,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
