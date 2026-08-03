import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { syncFashionPassport } from "@/lib/fashion-passport";

// Part 20: "Your measurements are ready for review" -> Confirm. Only
// meaningful when the current version is actually awaiting review — you
// can't confirm a Draft the business hasn't submitted yet.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireCustomerContext();
    const { id } = await params;

    const record = await prisma.passportMeasurementProfile.findUnique({ where: { id }, include: { currentVersion: true } });
    if (!record || record.customerProfileId !== profile.id) throw new ApiError(404, "Measurement profile not found");
    if (record.status !== "PENDING_REVIEW" || !record.currentVersion) {
      throw new ApiError(400, "This profile isn't awaiting your review");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.measurementVersion.update({ where: { id: record.currentVersion!.id }, data: { status: "CONFIRMED" } });
      const result = await tx.passportMeasurementProfile.update({ where: { id }, data: { status: "CONFIRMED" }, include: { currentVersion: true } });
      await syncFashionPassport(tx, profile);
      return result;
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
