import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));

    const measurement = await prisma.measurement.findFirst({ where: { id, businessId }, select: { id: true } });
    if (!measurement) throw new ApiError(404, "Measurement not found");

    const [history, total] = await Promise.all([
      prisma.measurementHistory.findMany({
        where: { measurementId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { actor: { select: { name: true } } },
      }),
      prisma.measurementHistory.count({ where: { measurementId: id } }),
    ]);

    return NextResponse.json({
      history,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
