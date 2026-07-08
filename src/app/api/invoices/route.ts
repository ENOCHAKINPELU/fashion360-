import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const customerId = req.nextUrl.searchParams.get("customerId");

    const invoices = await prisma.invoice.findMany({
      where: { businessId, ...(customerId ? { customerId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } }, payments: true },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
