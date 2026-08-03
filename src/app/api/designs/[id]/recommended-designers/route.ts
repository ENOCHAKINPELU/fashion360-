import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { findDesignersForDesign } from "@/lib/design-similarity";

// Public — "Find a Designer for This Style" (Part 14).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const designers = await findDesignersForDesign(prisma, { designId: id });
    return NextResponse.json({ designers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
