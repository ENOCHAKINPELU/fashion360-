import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import crypto from "crypto";
import { z } from "zod";
import { getNotificationProvider } from "@/lib/providers/notification";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email },
      include: { customerProfile: true },
    });

    const businessId = user?.businessId ?? user?.customerProfile?.businessId;

    // Always respond 200 regardless of whether the account exists, to avoid
    // leaking which emails are registered.
    if (user && businessId) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: { identifier: `reset:${email}`, token, expires: new Date(Date.now() + 1000 * 60 * 30) },
      });

      await getNotificationProvider().send({
        businessId,
        userId: user.id,
        channel: "EMAIL",
        title: "Reset your Fashion360 password",
        body: `Reset your password using this link: /reset-password?token=${token}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
