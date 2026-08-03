import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { personalizationSettingsSchema } from "@/lib/validations/personalization";
import { getOrCreatePersonalizationSettings, updatePersonalizationSettings } from "@/lib/personalization-settings";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const settings = await getOrCreatePersonalizationSettings(prisma, profile.id);
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const data = personalizationSettingsSchema.parse(await req.json());
    const settings = await updatePersonalizationSettings(prisma, profile.id, data);
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
