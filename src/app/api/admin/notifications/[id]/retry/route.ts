import { NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin, ApiError } from "@/lib/rbac";
import { retryFailedNotification } from "@/lib/admin-notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireSuperAdmin();
    const { id } = await params;
    const notification = await retryFailedNotification({ notificationLogId: id, actorId: session.user.id });
    if (!notification) throw new ApiError(404, "Notification not found");
    return NextResponse.json({ notification });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
