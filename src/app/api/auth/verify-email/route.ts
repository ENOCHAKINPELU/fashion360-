import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { z } from "zod";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { token } = schema.parse(await req.json());

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
      throw new ApiError(400, "This verification link is invalid or has expired");
    }

    const user = await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { token } });
    await logAuditEvent(prisma, { action: "EMAIL_VERIFIED", userId: user.id, entityType: "User", entityId: user.id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
