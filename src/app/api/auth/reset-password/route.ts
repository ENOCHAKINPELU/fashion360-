import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`reset:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many attempts. Please try again later.");

    const { token, password } = resetPasswordSchema.parse(await req.json());

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date() || !record.identifier.startsWith("reset:")) {
      throw new ApiError(400, "This reset link is invalid or has expired");
    }

    const email = record.identifier.replace("reset:", "");
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({ where: { email }, data: { passwordHash } });
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
