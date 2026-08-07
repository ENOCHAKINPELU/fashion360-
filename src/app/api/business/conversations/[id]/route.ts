import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId } = await requireBusinessContext();

    const conversation = await prisma.conversation.findFirst({
      where: { id, businessId },
      include: {
        customerProfile: { select: { id: true, user: { select: { name: true, image: true } } } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) throw new ApiError(404, "Conversation not found");

    if (conversation.businessUnreadCount > 0) {
      await prisma.conversation.update({ where: { id }, data: { businessUnreadCount: 0 } });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
