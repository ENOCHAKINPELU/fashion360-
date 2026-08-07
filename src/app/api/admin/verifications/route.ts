import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";

export async function GET() {
  try {
    await requireSuperAdmin();
    const verifications = await prisma.businessVerification.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: { business: { select: { id: true, name: true, email: true, phone: true, businessType: true, createdAt: true } } },
    });
    return NextResponse.json({ verifications });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
