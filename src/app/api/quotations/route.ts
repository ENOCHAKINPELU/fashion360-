import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { quotationSchema } from "@/lib/validations/quotation";
import { generateNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const customerId = req.nextUrl.searchParams.get("customerId");

    const quotations = await prisma.quotation.findMany({
      where: { businessId, ...(customerId ? { customerId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ quotations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const body = await req.json();
    const data = quotationSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, businessId },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const balance = data.price - data.deposit;
    if (balance < 0) throw new ApiError(400, "Deposit cannot exceed price");

    const quotation = await prisma.quotation.create({
      data: {
        businessId,
        customerId: data.customerId,
        orderId: data.orderId || null,
        quoteNumber: generateNumber("QUO"),
        description: data.description,
        price: data.price,
        deposit: data.deposit,
        balance,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
