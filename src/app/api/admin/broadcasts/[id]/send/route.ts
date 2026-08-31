import { NextResponse } from "next/server";
import { apiErrorResponse, requireSuperAdmin } from "@/lib/rbac";
import { sendBroadcastNow } from "@/lib/admin-broadcasts";

// The "Confirmation before sending" step the spec asks for happens
// client-side (a confirm dialog) before this route is ever called — once
// called, this really does fan out real notifications immediately, so
// there's no second, softer "are you sure" left to enforce server-side.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireSuperAdmin();
    const { id } = await params;
    const broadcast = await sendBroadcastNow({ broadcastId: id, actorId: session.user.id });
    return NextResponse.json({ broadcast });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
