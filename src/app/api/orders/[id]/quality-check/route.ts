import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { submitQualityCheck } from "@/lib/quality-control";

const schema = z.object({
  items: z.array(z.object({ label: z.string().min(1), passed: z.boolean(), notes: z.string().optional() })).min(1),
  confirmed: z.boolean(),
  notes: z.string().optional(),
  photos: z.array(z.string()),
  failure: z
    .object({
      issue: z.string().trim().min(1),
      correctionRequired: z.string().trim().min(1),
      expectedCorrectionDate: z.string().optional(),
    })
    .optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();
    const order = await prisma.order.findFirst({ where: { id, businessId } });
    if (!order) throw new ApiError(404, "Order not found");
    const checklists = await prisma.qualityControlChecklist.findMany({
      where: { orderId: id },
      orderBy: { attemptNumber: "desc" },
      include: { items: { orderBy: { sortOrder: "asc" } }, failure: true, confirmedBy: { select: { name: true } } },
    });
    return NextResponse.json({ checklists });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Part 10/11: submits one QC attempt. A passing attempt (every item passed +
// explicit confirmation) moves the order to QUALITY_CHECK; anything else
// requires `failure` and moves it to QUALITY_CHECK_FAILED, returning the
// order to production for correction.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const data = schema.parse(await req.json());

    const checklist = await prisma.$transaction((tx) =>
      submitQualityCheck(tx, {
        orderId: id,
        businessId,
        items: data.items,
        confirmed: data.confirmed,
        notes: data.notes,
        photos: data.photos,
        failure: data.failure
          ? {
              issue: data.failure.issue,
              correctionRequired: data.failure.correctionRequired,
              expectedCorrectionDate: data.failure.expectedCorrectionDate ? new Date(data.failure.expectedCorrectionDate) : null,
            }
          : undefined,
        actorId: session.user.id,
      })
    );

    return NextResponse.json({ checklist }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
