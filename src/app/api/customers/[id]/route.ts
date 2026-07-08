import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { customerSchema } from "@/lib/validations/customer";

async function getScopedCustomer(id: string, businessId: string) {
  const customer = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!customer) throw new ApiError(404, "Customer not found");
  return customer;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        measurements: { orderBy: { createdAt: "desc" } },
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
        appointments: { orderBy: { startTime: "desc" }, take: 20 },
        invoices: { orderBy: { createdAt: "desc" }, take: 20 },
        payments: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedCustomer(id, businessId);

    const body = await req.json();
    const data = customerSchema.partial().parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
        birthday: data.birthday ? new Date(data.birthday) : undefined,
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedCustomer(id, businessId);

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
