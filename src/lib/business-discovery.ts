import type { Prisma } from "@prisma/client";

// Part 23's four gating conditions, translated into a single reusable
// Prisma where-clause so /discover and every other public listing apply
// exactly the same rule (no risk of one query leaking a business the other
// correctly hides):
//
// 1. Profile is Active     -> verification status isn't SUSPENDED (the
//                              closest real "disabled" signal that exists;
//                              there is no separate Business.isActive flag).
// 2. Profile is Public     -> BusinessProfile.visibility === PUBLIC. Private
//                              stays owner-only; Unlisted stays link-only —
//                              neither should appear in search/browse.
// 3. Minimum profile info  -> at least one specialty, a location, contact
//                              info, and a description. Real fields only —
//                              no scoring, just presence checks.
// 4. Accepted platform terms -> the owning OWNER has a TERMS_OF_SERVICE
//                              UserConsent row (captured at registration
//                              from here on; backfilled once for accounts
//                              created before this existed).
export function discoverableBusinessWhere(): Prisma.BusinessWhereInput {
  return {
    profile: { visibility: "PUBLIC" },
    specialties: { some: {} },
    AND: [
      { profile: { description: { not: null } } },
      { OR: [{ city: { not: null } }, { state: { not: null } }] },
      { OR: [{ phone: { not: null } }, { email: { not: null } }] },
      { OR: [{ verification: null }, { verification: { is: { NOT: { status: "SUSPENDED" } } } }] },
      {
        users: {
          some: { role: "OWNER", consents: { some: { type: "TERMS_OF_SERVICE" } } },
        },
      },
    ],
  };
}
