import { NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { cancelBroadcast } from "@/lib/admin-broadcasts";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireSuperAdmin();
    const { id } = await params;
    const broadcast = await cancelBroadcast({ broadcastId: id, actorId: session.user.id });
    return NextResponse.json({ broadcast });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
