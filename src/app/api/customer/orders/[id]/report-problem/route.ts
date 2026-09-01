import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { reportDeliveryProblem } from "@/lib/dispute";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  issueType: z.enum(["WRONG_ITEM", "DAMAGED", "POOR_QUALITY", "NOT_AS_DESCRIBED", "SIZE_MISMATCH", "LATE_DELIVERY", "MISSING_ITEMS", "PACKAGE_MISSING", "NEVER_DELIVERED", "OTHER"]),
  description: z.string().trim().min(1, "Describe the problem"),
  photos: z.array(z.string()),
  videos: z.array(z.string()),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();

    const { allowed } = checkRateLimit(`report-problem:${profile.id}`, 10, 60 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many reports submitted. Please try again later.");

    const data = schema.parse(await req.json());

    const dispute = await prisma.$transaction((tx) =>
      reportDeliveryProblem(tx, {
        orderId: id,
        customerProfileId: profile.id,
        issueType: data.issueType,
        description: data.description,
        photos: data.photos,
        videos: data.videos,
      })
    );

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
