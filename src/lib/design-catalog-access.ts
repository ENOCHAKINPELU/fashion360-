import type { Prisma } from "@prisma/client";
import { discoverableBusinessWhere } from "@/lib/business-discovery";

// The design-catalog equivalent of discoverableBusinessWhere — a design is
// only marketplace-visible when it's PUBLISHED and its own business passes
// every one of Part 23's (Phase 3) discoverability gates. Every customer-
// facing design query (browse, similar, recommendations, occasion) shares
// this single where-clause so none of them can leak a draft/archived
// design or one belonging to a suspended/private business.
export function discoverableDesignWhere(): Prisma.DesignWhereInput {
  return {
    status: "PUBLISHED",
    business: discoverableBusinessWhere(),
  };
}
