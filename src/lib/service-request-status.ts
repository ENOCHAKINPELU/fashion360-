import type { ServiceRequestActor, ServiceRequestResponseType, ServiceRequestStatus } from "@prisma/client";

type ResponseLike = { actorType: ServiceRequestActor; type: ServiceRequestResponseType; createdAt: Date };

// Part 12/14: the status enum only tracks the net outcome (SUBMITTED ->
// UNDER_REVIEW -> ACCEPTED/DECLINED). Which side needs to act next is
// derived from the response thread rather than stored separately, so it
// can never drift out of sync with the actual conversation.
export function getServiceRequestAwaitingActor(
  status: ServiceRequestStatus,
  responses: ResponseLike[]
): "business" | "customer" | null {
  if (status === "DRAFT" || status === "SUBMITTED") return "business";
  if (status !== "UNDER_REVIEW" && status !== "RECEIVED") return null;

  const last = [...responses].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).at(-1);
  if (!last) return "business";
  if (last.actorType === "BUSINESS") return "customer";
  return "business";
}
