import { prisma } from "@/lib/prisma";

// The bridge between a customer's platform identity and the business-owned
// CRM data that already exists about them (orders, measurements, designs,
// appointments, payments) — every read-only "My X" page in /account uses
// this to know which Customer rows, across however many businesses, are
// actually theirs. Only ACTIVE relationships with a resolved linkedCustomer
// are included, so a revoked or still-PENDING relationship never leaks data.
export async function getLinkedCustomerRecords(customerProfileId: string) {
  const relationships = await prisma.businessCustomerRelationship.findMany({
    where: { customerProfileId, status: "ACTIVE", linkedCustomerId: { not: null } },
    include: { business: { select: { id: true, name: true, logoUrl: true } } },
  });

  return relationships.map((r) => ({
    customerId: r.linkedCustomerId as string,
    businessId: r.businessId,
    businessName: r.business.name,
    businessLogoUrl: r.business.logoUrl,
  }));
}
