import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logMeasurementHistory } from "@/lib/measurement-history";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const source = await prisma.measurementProfile.findFirst({
      where: { id, businessId },
      include: { measurements: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!source) throw new ApiError(404, "Measurement profile not found");

    const { name } = schema.parse(await req.json().catch(() => ({})));
    const latest = source.measurements[0];

    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.measurementProfile.create({
        data: {
          businessId,
          customerId: source.customerId,
          name: name || `${source.name} (Copy)`,
        },
      });

      if (latest) {
        await tx.measurement.create({
          data: {
            businessId,
            customerId: source.customerId,
            profileId: created.id,
            templateId: latest.templateId,
            source: latest.source,
            status: "APPROVED",
            unit: latest.unit,
            values: latest.values as object,
            fitPreference: latest.fitPreference,
            createdById: session.user.id,
          },
        });
      }

      await logMeasurementHistory(tx, {
        businessId,
        profileId: created.id,
        action: "PROFILE_DUPLICATED",
        reason: `Duplicated from "${source.name}"`,
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
