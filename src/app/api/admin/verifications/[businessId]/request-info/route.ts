import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { dispatchNotification } from "@/lib/notification-center";

const schema = z.object({ message: z.string().trim().min(1, "A message is required") });

// The third verification action alongside the existing Verify/Reject
// decide route: doesn't change BusinessVerificationStatus at all (stays
// wherever it was — usually PENDING), just notifies the business with
// what the admin needs from them. Same notification pattern the decide
// route already uses.
export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await params;
    await requireSuperAdmin();
    const { message } = schema.parse(await req.json());

    await dispatchNotification(prisma, {
      event: "DESIGNER_VERIFIED",
      channel: "IN_APP",
      businessId,
      title: "More information needed for verification",
      body: message,
      inAppType: "warning",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
