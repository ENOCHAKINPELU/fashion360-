import { NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin, ApiError } from "@/lib/rbac";
import { getAdminNotificationDetail } from "@/lib/admin-notifications";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const notification = await getAdminNotificationDetail(id);
    if (!notification) throw new ApiError(404, "Notification not found");
    return NextResponse.json({ notification });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
