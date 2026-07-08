import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { profileSchema, notificationPreferencesSchema } from "@/lib/validations/profile";
import { z } from "zod";

const patchSchema = z.object({
  profile: profileSchema.partial().optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, "Not authenticated");

    const { profile, notificationPreferences } = patchSchema.parse(await req.json());

    const name =
      profile?.firstName || profile?.lastName
        ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
        : undefined;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(profile?.firstName !== undefined ? { firstName: profile.firstName } : {}),
        ...(profile?.lastName !== undefined ? { lastName: profile.lastName } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(profile?.phone !== undefined ? { phone: profile.phone } : {}),
        ...(profile?.position !== undefined ? { position: profile.position } : {}),
        ...(profile?.image !== undefined ? { image: profile.image || null } : {}),
        ...(notificationPreferences !== undefined ? { notificationPreferences } : {}),
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
