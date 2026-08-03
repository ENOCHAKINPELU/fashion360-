import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { resolveReviewReport } from "@/lib/reviews";

const schema = z.object({ status: z.enum(["DISMISSED", "ACTIONED"]), resolutionNote: z.string().trim().max(1000).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireSuperAdmin();
    const data = schema.parse(await req.json());

    const report = await resolveReviewReport(prisma, { reportId: id, status: data.status, resolutionNote: data.resolutionNote, resolvedById: session.user.id });
    return NextResponse.json({ report });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
