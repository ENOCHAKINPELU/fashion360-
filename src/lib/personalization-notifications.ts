import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyCustomer } from "@/lib/service-request-notify";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 24: "New designs from a designer you saved" / "Your favorite
// designer has new services" — notifies customers who saved the design's
// designer directly (CustomerPreferredDesigner) or favorited the business
// itself (BusinessFavorite), respecting each customer's own
// PersonalizationSettings toggle. Deliberately fires once per event, never
// per-viewer-per-day, to avoid spam.
async function getFollowerProfileIds(db: Db, businessId: string) {
  const [preferred, favorited] = await Promise.all([
    db.customerPreferredDesigner.findMany({ where: { businessId }, select: { customerProfileId: true } }),
    db.businessFavorite.findMany({ where: { businessId }, select: { customerProfileId: true } }),
  ]);
  return [...new Set([...preferred.map((p) => p.customerProfileId), ...favorited.map((f) => f.customerProfileId)])];
}

export async function notifyFollowersOfNewDesign(db: Db, params: { businessId: string; businessName: string; designName: string }) {
  const followerIds = await getFollowerProfileIds(db, params.businessId);
  if (followerIds.length === 0) return;

  const settings = await db.personalizationSettings.findMany({ where: { customerProfileId: { in: followerIds } } });
  const optedOutIds = new Set(settings.filter((s) => !s.notifyNewDesignsFromSaved).map((s) => s.customerProfileId));

  for (const customerProfileId of followerIds) {
    if (optedOutIds.has(customerProfileId)) continue;
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId,
      title: "New design from a designer you saved",
      body: `${params.businessName} just published "${params.designName}".`,
      type: "info",
    });
  }
}

export async function notifyFollowersOfNewService(db: Db, params: { businessId: string; businessName: string; serviceName: string }) {
  const followerIds = await getFollowerProfileIds(db, params.businessId);
  if (followerIds.length === 0) return;

  const settings = await db.personalizationSettings.findMany({ where: { customerProfileId: { in: followerIds } } });
  const optedOutIds = new Set(settings.filter((s) => !s.notifySavedDesignerServices).map((s) => s.customerProfileId));

  for (const customerProfileId of followerIds) {
    if (optedOutIds.has(customerProfileId)) continue;
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId,
      title: "Your favorite designer has a new service",
      body: `${params.businessName} now offers "${params.serviceName}".`,
      type: "info",
    });
  }
}
