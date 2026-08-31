import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { getAdminBroadcastList, createBroadcast } from "@/lib/admin-broadcasts";
import type { BroadcastStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const url = new URL(req.url);
    const list = await getAdminBroadcastList({
      status: (url.searchParams.get("status") as BroadcastStatus) || undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
    });
    return NextResponse.json(list);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(2000),
  target: z.enum(["ALL_USERS", "CUSTOMERS", "DESIGNERS", "SEGMENT"]),
  segment: z.enum(["VERIFIED_DESIGNERS", "UNVERIFIED_DESIGNERS", "SUSPENDED_ACCOUNTS", "HIGH_VALUE_CUSTOMERS", "INACTIVE_CUSTOMERS"]).optional(),
  channel: z.enum(["IN_APP", "EMAIL"]),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireSuperAdmin();
    const data = createSchema.parse(await req.json());

    const broadcast = await createBroadcast({
      title: data.title,
      body: data.body,
      target: data.target,
      segment: data.segment ?? null,
      channel: data.channel,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      actorId: session.user.id,
    });

    return NextResponse.json({ broadcast }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
