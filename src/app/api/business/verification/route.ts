import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const verification = await prisma.businessVerification.findUnique({ where: { businessId } });
    return NextResponse.json({ verification });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const submitSchema = z.object({
  submissionNote: z.string().trim().min(1, "Tell us a bit about your business").max(2000),
  documentUrl: z.string().url().optional().or(z.literal("")),
});

// The "Verified" trust badge (business-trust-profile.ts) has always read
// BusinessVerification.status, but nothing ever wrote it except a raw
// database edit — this is the business's half of closing that gap; see
// /api/admin/verifications for the admin decision half.
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = submitSchema.parse(await req.json());

    const existing = await prisma.businessVerification.findUnique({ where: { businessId } });
    if (existing?.status === "PENDING") throw new ApiError(409, "A verification request is already pending review");
    if (existing?.status === "VERIFIED") throw new ApiError(409, "This business is already verified");

    const verification = await prisma.businessVerification.upsert({
      where: { businessId },
      update: {
        status: "PENDING",
        submissionNote: data.submissionNote,
        documentUrl: data.documentUrl || null,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        notes: null,
      },
      create: {
        businessId,
        status: "PENDING",
        submissionNote: data.submissionNote,
        documentUrl: data.documentUrl || null,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
