import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";

export async function GET() {
  try {
    await requireSuperAdmin();
    const [signups, customerCount, designerCount] = await Promise.all([
      prisma.waitlistSignup.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.waitlistSignup.count({ where: { role: "CUSTOMER" } }),
      prisma.waitlistSignup.count({ where: { role: "DESIGNER" } }),
    ]);
    return NextResponse.json({ signups, customerCount, designerCount });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
