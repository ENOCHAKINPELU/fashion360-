import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse } from "@/lib/rbac";
import { customerSchema } from "@/lib/validations/customer";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const q = req.nextUrl.searchParams.get("q");

    const customers = await prisma.customer.findMany({
      where: {
        businessId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true, measurements: true } } },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const body = await req.json();
    const data = customerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        businessId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        birthday: data.birthday ? new Date(data.birthday) : null,
        gender: data.gender || null,
        preferredColors: data.preferredColors,
        preferredFabrics: data.preferredFabrics,
        stylePreferences: data.stylePreferences,
        specialNotes: data.specialNotes || null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
