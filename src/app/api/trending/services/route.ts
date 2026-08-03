import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { getPopularServices } from "@/lib/trending";

export async function GET() {
  try {
    const services = await getPopularServices(prisma);
    return NextResponse.json({ services });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
