import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { getAdminSystemAlertList } from "@/lib/admin-system-alerts";
import type { SystemAlertCategory, SystemAlertSeverity } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const url = new URL(req.url);
    const resolvedParam = url.searchParams.get("resolved");
    const list = await getAdminSystemAlertList({
      category: (url.searchParams.get("category") as SystemAlertCategory) || undefined,
      severity: (url.searchParams.get("severity") as SystemAlertSeverity) || undefined,
      resolved: resolvedParam === null ? undefined : resolvedParam === "true",
      page: Number(url.searchParams.get("page") ?? "1"),
    });
    return NextResponse.json(list);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
