import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { findSimilarDesigns } from "@/lib/design-similarity";

// Public — "Show Me More Like This" (Part 13) works the same for a
// logged-out visitor as a signed-in customer.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const similar = await findSimilarDesigns(prisma, { designId: id });
    return NextResponse.json({ designs: similar });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
