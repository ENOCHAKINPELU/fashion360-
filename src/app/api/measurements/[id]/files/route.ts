import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  category: z.enum(["reference_image", "sketch", "previous_sheet", "document"]).default("reference_image"),
  fileType: z.string().optional(),
  sizeBytes: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const measurement = await prisma.measurement.findFirst({ where: { id, businessId } });
    if (!measurement) throw new ApiError(404, "Measurement not found");

    const data = schema.parse(await req.json());

    const file = await prisma.measurementFile.create({
      data: {
        businessId,
        customerId: measurement.customerId,
        measurementId: id,
        profileId: measurement.profileId,
        ...data,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
