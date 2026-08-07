import { requireCustomerContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CustomerMessagesClient } from "@/features/messaging/components/customer-messages-client";

export default async function CustomerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const { profile } = await requireCustomerContext();
  const { open } = await searchParams;

  const conversations = await prisma.conversation.findMany({
    where: { customerProfileId: profile.id },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: { business: { select: { id: true, name: true, logoUrl: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">Direct conversations with businesses you&apos;re working with.</p>
      </div>
      <CustomerMessagesClient initialConversations={JSON.parse(JSON.stringify(conversations))} preferredId={open} />
    </div>
  );
}
