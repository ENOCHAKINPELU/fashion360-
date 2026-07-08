import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { getNotificationProvider } from "@/lib/providers/notification";

const registerSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + crypto.randomBytes(3).toString("hex")
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = registerSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(data.password, 12);

    const { user, business } = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: data.businessName, slug: slugify(data.businessName) },
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.ownerName,
          passwordHash,
          role: "OWNER",
          businessId: business.id,
        },
      });

      return { user, business };
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    await getNotificationProvider().send({
      businessId: business.id,
      userId: user.id,
      channel: "EMAIL",
      title: "Verify your Fashion360 account",
      body: `Welcome to Fashion360! Verify your email using this link: /verify-email?token=${token}`,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
