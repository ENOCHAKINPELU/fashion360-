import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { previewBroadcastRecipientCount } from "@/lib/admin-broadcasts";

const schema = z.object({
  target: z.enum(["ALL_USERS", "CUSTOMERS", "DESIGNERS", "SEGMENT"]),
  segment: z.enum(["VERIFIED_DESIGNERS", "UNVERIFIED_DESIGNERS", "SUSPENDED_ACCOUNTS", "HIGH_VALUE_CUSTOMERS", "INACTIVE_CUSTOMERS"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const data = schema.parse(await req.json());
    const count = await previewBroadcastRecipientCount({ target: data.target, segment: data.segment ?? null });
    return NextResponse.json({ count });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
