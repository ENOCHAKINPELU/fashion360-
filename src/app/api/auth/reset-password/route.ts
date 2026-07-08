import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json());

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
