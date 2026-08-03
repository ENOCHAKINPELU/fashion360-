import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { sessionStartSchema } from "@/lib/validations/measurement";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    const customerId = params.get("customerId");

    const sessions = await prisma.measurementSession.findMany({
      where: {
        businessId,
        ...(status ? { status: status as never } : {}),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { startedAt: "desc" },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        profile: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        startedBy: { select: { name: true } },
      },
      take: 100,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = sessionStartSchema.parse(await req.json());

    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const measurementSession = await prisma.measurementSession.create({
      data: {
        businessId,
        customerId: data.customerId,
        profileId: data.profileId,
        templateId: data.templateId,
        method: data.method,
        status: "IN_PROGRESS",
        startedById: session.user.id,
      },
      include: { customer: { select: { firstName: true, lastName: true } }, template: { select: { name: true } } },
    });

    return NextResponse.json({ session: measurementSession }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
