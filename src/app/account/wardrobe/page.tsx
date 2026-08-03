import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { isWardrobeItemReadyForReorder } from "@/lib/reorder";
import { WardrobePageClient } from "@/features/personalization/components/wardrobe-page-client";

// Part 15 (Phase 10): real write-paths now feed these — see
// lib/fashion-milestones.ts, hooked from order completion (payout.ts),
// order placement (order-agreement.ts), and review submission (reviews.ts).
export default async function CustomerWardrobePage() {
  const { profile } = await requireCustomerContext();

  const [wardrobeItems, fashionHistory] = await Promise.all([
    prisma.customerWardrobeItem.findMany({ where: { customerProfileId: profile.id }, orderBy: { createdAt: "desc" } }),
    prisma.customerFashionHistory.findMany({ where: { customerProfileId: profile.id }, orderBy: { occurredAt: "desc" } }),
  ]);

  const items = wardrobeItems.map((item) => ({
    id: item.id,
    garmentName: item.garmentName,
    imageUrl: item.imageUrl,
    category: item.category,
    createdAt: item.createdAt.toISOString(),
    readyForReorder: isWardrobeItemReadyForReorder(item.createdAt),
  }));
  const history = fashionHistory.map((h) => ({ id: h.id, eventType: h.eventType, description: h.description, occurredAt: h.occurredAt.toISOString() }));

  return <WardrobePageClient wardrobeItems={items} fashionHistory={history} />;
}
