import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireSuperAdmin } from "@/lib/rbac";

const decideSchema = z.object({
  decision: z.enum(["VERIFIED", "REJECTED"]),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    const { session } = await requireSuperAdmin();
    const data = decideSchema.parse(await req.json());

    const existing = await prisma.businessVerification.findUnique({ where: { businessId } });
    if (!existing) throw new ApiError(404, "No verification request found for this business");

    const verification = await prisma.businessVerification.update({
      where: { businessId },
      data: {
        status: data.decision,
        notes: data.notes || null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    });

    await prisma.notification.create({
      data: {
        businessId,
        title: data.decision === "VERIFIED" ? "Your business is now verified" : "Your verification request was declined",
        body:
          data.decision === "VERIFIED"
            ? "Congratulations — the Verified badge now shows on your public profile."
            : data.notes || "Please review the feedback and submit again when ready.",
        type: data.decision === "VERIFIED" ? "success" : "warning",
      },
    });

    return NextResponse.json({ verification });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
