import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { privacySettingsSchema } from "@/lib/validations/customer-account";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const settings = await prisma.privacySettings.upsert({
      where: { customerProfileId: profile.id },
      update: {},
      create: { customerProfileId: profile.id },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const data = privacySettingsSchema.partial().parse(await req.json());

    const settings = await prisma.privacySettings.upsert({
      where: { customerProfileId: profile.id },
      update: data,
      create: { customerProfileId: profile.id, ...data },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
