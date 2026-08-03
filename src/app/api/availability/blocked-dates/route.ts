import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { blockedDateSchema } from "@/lib/validations/appointment";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const blockedDates = await prisma.blockedDate.findMany({
      where: { businessId },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ blockedDates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext(["OWNER", "SUPER_ADMIN"]);
    const data = blockedDateSchema.parse(await req.json());

    const blockedDate = await prisma.blockedDate.create({
      data: {
        businessId,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        reason: data.reason || null,
      },
    });

    return NextResponse.json({ blockedDate }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
