import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { getAdminNotificationList, getAdminNotificationStats } from "@/lib/admin-notifications";
import type { NotificationChannel, NotificationStatus, NotificationEvent, UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? "1");

    const [list, stats] = await Promise.all([
      getAdminNotificationList({
        q: url.searchParams.get("q") ?? undefined,
        channel: (url.searchParams.get("channel") as NotificationChannel) || undefined,
        status: (url.searchParams.get("status") as NotificationStatus) || undefined,
        recipientType: (url.searchParams.get("recipientType") as UserRole) || undefined,
        event: (url.searchParams.get("event") as NotificationEvent) || undefined,
        dateFrom: url.searchParams.get("dateFrom") ?? undefined,
        dateTo: url.searchParams.get("dateTo") ?? undefined,
        page,
      }),
      getAdminNotificationStats(),
    ]);

    return NextResponse.json({ ...list, stats });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
