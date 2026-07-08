import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { measurementSchema } from "@/lib/validations/measurement";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const customerId = req.nextUrl.searchParams.get("customerId");

    const measurements = await prisma.measurement.findMany({
      where: {
        businessId,
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ measurements });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const body = await req.json();
    const data = measurementSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, businessId },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const measurement = await prisma.measurement.create({
      data: {
        businessId,
        customerId: data.customerId,
        label: data.label,
        source: data.source,
        neck: data.neck,
        shoulder: data.shoulder,
        chestBust: data.chestBust,
        waist: data.waist,
        hip: data.hip,
        sleeveLength: data.sleeveLength,
        armLength: data.armLength,
        inseam: data.inseam,
        thigh: data.thigh,
        garmentLength: data.garmentLength,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        frontImageUrl: data.frontImageUrl,
        sideImageUrl: data.sideImageUrl,
        aiApprovedAt: data.source === "AI_ESTIMATED" ? new Date() : null,
        notes: data.notes,
      },
    });

    return NextResponse.json({ measurement }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
