import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const favorites = await prisma.designFavorite.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        design: {
          include: { category: true, tags: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        },
      },
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
