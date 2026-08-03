import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { getOrCreatePlatformSettings } from "@/lib/platform-settings";

const schema = z.object({
  platformFeePercentage: z.coerce.number().min(0).max(100),
  disputeWindowDays: z.coerce.number().int().min(1).max(30),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await getOrCreatePlatformSettings(prisma);
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Part 26: platform fee is never hard-coded and never editable by a
// business — only a super admin can change it.
export async function PUT(req: NextRequest) {
  try {
    const { session } = await requireSuperAdmin();
    const data = schema.parse(await req.json());
    const existing = await getOrCreatePlatformSettings(prisma);

    const settings = await prisma.platformSettings.update({
      where: { id: existing.id },
      data: { platformFeePercentage: data.platformFeePercentage, disputeWindowDays: data.disputeWindowDays, updatedById: session.user.id },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
