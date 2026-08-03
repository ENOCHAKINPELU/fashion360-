import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { getTrendingDesigners } from "@/lib/trending";

export async function GET() {
  try {
    const designers = await getTrendingDesigners(prisma);
    return NextResponse.json({ designers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
