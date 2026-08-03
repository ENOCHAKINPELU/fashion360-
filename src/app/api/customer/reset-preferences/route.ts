import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { resetPreferences } from "@/lib/personalization-settings";

export async function POST() {
  try {
    const { profile } = await requireCustomerContext();
    await resetPreferences(prisma, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
