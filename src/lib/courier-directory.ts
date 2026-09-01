// ============================================================================
// COURIER DIRECTORY — manual-verification delivery flow
// ============================================================================
//
// The named list a designer picks from when creating a MANUAL delivery, plus
// an honest "Track on Courier Website" URL builder. This deliberately does
// NOT integrate any courier's API — see lib/logistics-architecture.ts for
// why (no real courier API exists in this codebase). What it does instead is
// what the manual-verification flow asks for: a real link to a courier's own
// public tracking page where one is confidently known, and nothing invented
// for the rest.
//
// Only DHL and FedEx get a query-param URL that pre-fills the tracking
// number — those are well-established, stable public URL patterns. GIG
// Logistics gets a link to its real tracking page but without a guessed
// query-param format (better to send the customer somewhere real and let
// them paste the number in than fabricate a deep link that might not work).
// GUO Express, Kwik, and Uber Package have no confidently-known public
// tracking URL, so they get none — the UI falls back to "no online tracking
// available for this courier" rather than a broken or invented link. Local
// Dispatch Rider and Other never have one, by definition.

export const SUPPORTED_COURIERS = [
  "DHL",
  "GIG Logistics",
  "GUO Express",
  "FedEx",
  "Kwik",
  "Uber Package",
  "Local Dispatch Rider",
  "Other",
] as const;

export type SupportedCourier = (typeof SUPPORTED_COURIERS)[number];

export function buildCourierTrackingUrl(courierName: string | null | undefined, trackingNumber: string | null | undefined): string | null {
  if (!courierName || !trackingNumber) return null;
  const encoded = encodeURIComponent(trackingNumber.trim());
  switch (courierName) {
    case "DHL":
      return `https://www.dhl.com/ng-en/home/tracking.html?tracking-id=${encoded}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
    case "GIG Logistics":
      return "https://giglogistics.com/track";
    default:
      return null;
  }
}
