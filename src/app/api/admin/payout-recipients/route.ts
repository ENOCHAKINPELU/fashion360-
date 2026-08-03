import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";

export async function GET() {
  try {
    await requireSuperAdmin();
    const recipients = await prisma.payoutRecipient.findMany({
      where: { kycStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { business: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ recipients });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
