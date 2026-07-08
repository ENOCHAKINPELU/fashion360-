import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { changePasswordSchema } from "@/lib/validations/profile";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, "Not authenticated");

    const { currentPassword, newPassword } = changePasswordSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.passwordHash) throw new ApiError(400, "This account has no password set");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, "Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
