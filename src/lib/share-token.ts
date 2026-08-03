import { randomBytes } from "crypto";

// Shared by every secure-share-link flow (design previews, quotations,
// invoices) so the token format/strength lives in exactly one place.
export function generateShareToken() {
  return randomBytes(24).toString("base64url");
}
