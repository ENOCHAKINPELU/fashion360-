// One-time platform setup: creates the Flutterwave "Transfer Sender" every
// payout transfer must reference (payment_instruction.sender_id). Run once
// per Flutterwave environment (sandbox vs live each need their own), then
// put the returned id in FLUTTERWAVE_SENDER_ID — never re-run casually,
// re-running just creates a redundant sender, it doesn't update anything.
//
// Usage: node scripts/setup-flutterwave-sender.mjs
// Reads FLUTTERWAVE_CLIENT_ID / FLUTTERWAVE_CLIENT_SECRET from .env.
import "dotenv/config";

const IDP_TOKEN_URL = "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";
const API_BASE = "https://developersandbox-api.flutterwave.com"; // sandbox — see src/lib/flutterwave.ts's note on live

async function getAccessToken() {
  const res = await fetch(IDP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.FLUTTERWAVE_CLIENT_ID,
      client_secret: process.env.FLUTTERWAVE_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Token request failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

const token = await getAccessToken();
const res = await fetch(`${API_BASE}/transfers/senders`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "generic_sender", name: { first: "Fashion", last: "Platform" } }),
});
const json = await res.json();
if (!res.ok) throw new Error(`Sender creation failed: ${JSON.stringify(json)}`);

console.log("Created sender:", json.data.id);
console.log("Set FLUTTERWAVE_SENDER_ID to this value in .env and Vercel.");
