import { NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { resolveSystemAlert } from "@/lib/admin-system-alerts";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireSuperAdmin();
    const { id } = await params;
    const alert = await resolveSystemAlert({ alertId: id, actorId: session.user.id });
    return NextResponse.json({ alert });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
