import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-log";
import { nextCustomerCode } from "@/lib/customer-code";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 15: once a service request reaches mutual acceptance, the
// relationship becomes ACTIVE directly — unlike the Phase 2 "Connect" CTA
// (POST /api/businesses/[id]/connect), which opens a PENDING request
// awaiting a separate accept/decline. Reuses the same
// BusinessCustomerRelationship row a direct Connect would use, so "already
// have an active relationship" and "a service request just activated one"
// are never two different things — the unique(businessId, customerProfileId)
// constraint is what actually prevents duplicates either way.
//
// Returns the bridged CRM Customer.id (never the relationship row) since
// every caller ultimately needs that id to create Appointments/etc. against
// the existing CRM-scoped models — see ensureLinkedCrmCustomer below.
export async function ensureActiveRelationship(
  db: Db,
  params: { businessId: string; customerProfileId: string; actorUserId: string }
) {
  const existing = await db.businessCustomerRelationship.findUnique({
    where: { businessId_customerProfileId: { businessId: params.businessId, customerProfileId: params.customerProfileId } },
  });

  if (existing?.status === "ACTIVE") {
    return ensureLinkedCrmCustomer(db, existing);
  }

  const relationship = existing
    ? await db.businessCustomerRelationship.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", respondedAt: new Date(), revokedAt: null },
      })
    : await db.businessCustomerRelationship.create({
        data: {
          businessId: params.businessId,
          customerProfileId: params.customerProfileId,
          status: "ACTIVE",
          initiatedBy: "CUSTOMER",
          respondedAt: new Date(),
        },
      });

  await logAuditEvent(db, {
    action: "BUSINESS_RELATIONSHIP_ACCEPTED",
    userId: params.actorUserId,
    businessId: params.businessId,
    entityType: "BusinessCustomerRelationship",
    entityId: relationship.id,
    metadata: { reason: "service_request_mutual_acceptance" },
  });

  return ensureLinkedCrmCustomer(db, relationship);
}

// Phase 3's platform-level relationship can go ACTIVE without ever touching
// the business-owned CRM (e.g. accepted straight from a Service Request,
// with no prior Customer row to auto-match at registration). Phase 4's
// Appointment/Measurement reuse of the existing CRM-scoped models depends
// on every ACTIVE relationship resolving to a real Customer row, so this
// creates one on first use rather than requiring it to already exist.
export async function ensureLinkedCrmCustomer(
  db: Db,
  relationship: { id: string; businessId: string; customerProfileId: string; linkedCustomerId: string | null }
) {
  if (relationship.linkedCustomerId) return relationship.linkedCustomerId;

  const profile = await db.customerProfile.findUniqueOrThrow({
    where: { id: relationship.customerProfileId },
    include: { user: { select: { firstName: true, lastName: true, name: true, email: true, phone: true } } },
  });

  const [firstName, ...rest] = (profile.user.name ?? profile.user.firstName ?? "Customer").trim().split(/\s+/);
  const customerCode = await nextCustomerCode(db, relationship.businessId);

  const customer = await db.customer.create({
    data: {
      businessId: relationship.businessId,
      customerCode,
      firstName: profile.user.firstName || firstName || "Customer",
      lastName: profile.user.lastName || rest.join(" ") || "",
      email: profile.user.email,
      phone: profile.phone ?? profile.user.phone ?? null,
    },
  });

  await db.businessCustomerRelationship.update({
    where: { id: relationship.id },
    data: { linkedCustomerId: customer.id },
  });

  return customer.id;
}
