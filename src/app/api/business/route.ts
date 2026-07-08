import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  measurementUnit: z.enum(["metric", "imperial"]).optional(),
  workingHoursText: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext(["OWNER", "SUPER_ADMIN"]);
    const data = schema.parse(await req.json());

    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
        ...(data.measurementUnit ? { measurementUnit: data.measurementUnit } : {}),
        ...(data.workingHoursText !== undefined
          ? { workingHours: { text: data.workingHoursText } }
          : {}),
        ...(data.instagram !== undefined || data.facebook !== undefined || data.whatsapp !== undefined
          ? { socialLinks: { instagram: data.instagram, facebook: data.facebook, whatsapp: data.whatsapp } }
          : {}),
      },
    });

    return NextResponse.json({ business });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
