import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { getTrendingDesigns } from "@/lib/trending";

export async function GET() {
  try {
    const designs = await getTrendingDesigns(prisma);
    return NextResponse.json({ designs });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
