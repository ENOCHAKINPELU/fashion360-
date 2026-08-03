import type { AuditLogAction } from "@prisma/client";

// Human-readable labels for a customer's own "Recent Activity" feed (Part
// 18) — reuses the platform-wide AuditLog trail rather than building a
// second activity model, since every event that matters to a customer
// (registration, connections, access grants) already writes here.
export const CUSTOMER_AUDIT_LABELS: Partial<Record<AuditLogAction, string>> = {
  USER_REGISTERED: "You joined Fashion360",
  CUSTOMER_REGISTERED: "You created your Fashion Passport",
  USER_LOGIN: "You signed in",
  PASSWORD_CHANGED: "You changed your password",
  EMAIL_VERIFIED: "You verified your email",
  BUSINESS_RELATIONSHIP_REQUESTED: "A connection request was sent",
  BUSINESS_RELATIONSHIP_ACCEPTED: "A business connection was accepted",
  BUSINESS_RELATIONSHIP_DECLINED: "A business connection was declined",
  CUSTOMER_ACCESS_REVOKED: "You updated a business connection",
  MEASUREMENT_ACCESS_GRANTED: "You shared your measurements with a business",
  MEASUREMENT_ACCESS_REVOKED: "You revoked measurement access",
};
