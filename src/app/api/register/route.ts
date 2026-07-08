import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { registerSchema } from "@/lib/validations/auth";
import { sendEmail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many attempts. Please try again later.");

    const data = registerSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const name = `${data.firstName} ${data.lastName}`.trim();

    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        name,
        passwordHash,
        role: "OWNER",
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: { identifier: user.email, token, expires: new Date(Date.now() + 1000 * 60 * 60 * 24) },
    });

    await sendEmail({
      to: user.email,
      subject: "Verify your Fashion360 account",
      body: `Welcome to Fashion360, ${data.firstName}! Verify your email: ${process.env.AUTH_URL ?? ""}/verify-email?token=${token}`,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
