import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { deleteActivityHistory } from "@/lib/personalization-settings";

// Part 25: "Delete Activity History where legally and technically
// appropriate" — a real delete, distinct from clearing recommendations
// (Part 25 lists both controls separately).
export async function DELETE() {
  try {
    const { profile } = await requireCustomerContext();
    await deleteActivityHistory(prisma, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
