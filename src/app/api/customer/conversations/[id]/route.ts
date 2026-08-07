import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();

    const conversation = await prisma.conversation.findFirst({
      where: { id, customerProfileId: profile.id },
      include: {
        business: { select: { id: true, name: true, logoUrl: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) throw new ApiError(404, "Conversation not found");

    if (conversation.customerUnreadCount > 0) {
      await prisma.conversation.update({ where: { id }, data: { customerUnreadCount: 0 } });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
