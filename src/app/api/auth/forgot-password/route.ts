import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendEmail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { email } = forgotPasswordSchema.parse(await req.json());

    const { allowed } = checkRateLimit(`forgot:${ip}:${email}`, 5, 15 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many attempts. Please try again later.");

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond 200 regardless of whether the account exists, to avoid
    // leaking which emails are registered.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: { identifier: `reset:${email}`, token, expires: new Date(Date.now() + 1000 * 60 * 30) },
      });

      await sendEmail({
        to: email,
        subject: "Reset your Fashion360 password",
        body: `Reset your password: ${process.env.AUTH_URL ?? ""}/reset-password?token=${token}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
