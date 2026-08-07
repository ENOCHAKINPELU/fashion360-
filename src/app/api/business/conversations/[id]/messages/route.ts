import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

const sendSchema = z.object({ body: z.string().trim().min(1, "Message can't be empty").max(4000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const { body } = sendSchema.parse(await req.json());

    const conversation = await prisma.conversation.findFirst({ where: { id, businessId } });
    if (!conversation) throw new ApiError(404, "Conversation not found");

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: id, senderType: "BUSINESS", senderId: session.user.id, body },
      });
      await tx.conversation.update({
        where: { id },
        data: {
          lastMessageAt: created.createdAt,
          lastMessagePreview: body.slice(0, 200),
          customerUnreadCount: { increment: 1 },
          businessUnreadCount: 0,
        },
      });
      return created;
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
