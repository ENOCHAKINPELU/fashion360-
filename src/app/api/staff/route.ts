import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const staff = await prisma.user.findMany({
      where: { businessId, role: { in: ["OWNER", "STAFF"] } },
      select: { id: true, name: true, image: true, position: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ staff });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
