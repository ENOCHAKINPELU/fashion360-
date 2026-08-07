import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BusinessMessagesClient } from "@/features/messaging/components/business-messages-client";

export default async function BusinessMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const { open } = await searchParams;

  const conversations = await prisma.conversation.findMany({
    where: { businessId },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: { customerProfile: { select: { id: true, user: { select: { name: true, image: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">Direct conversations with your customers.</p>
      </div>
      <BusinessMessagesClient initialConversations={JSON.parse(JSON.stringify(conversations))} preferredId={open} />
    </div>
  );
}
