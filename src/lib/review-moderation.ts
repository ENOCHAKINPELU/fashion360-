// Part 9: automatic BASIC moderation checks — no third-party moderation API
// is configured for this platform, so this is a small, honest heuristic
// pass (pattern/format checks only), never a judgment on whether the
// opinion itself is negative. A flagged review still gets published-pending
// review by an admin (Part 9: "do not automatically reject legitimate
// negative reviews simply because they are negative").
const PERSONAL_INFO_PATTERNS = [
  /\b\d{10,11}\b/, // long digit runs (phone numbers)
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // email addresses
  /\b(?:https?:\/\/|www\.)\S+/i, // links
];

const SPAM_KEYWORDS = ["buy followers", "click here", "free money", "work from home", "crypto investment", "guaranteed profit"];

export interface ModerationResult {
  flagged: boolean;
  reasons: string[];
}

export function runBasicModerationCheck(text: string): ModerationResult {
  const reasons: string[] = [];
  const trimmed = text.trim();

  for (const pattern of PERSONAL_INFO_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push("Contains a phone number, email address, or link");
      break;
    }
  }

  const lower = trimmed.toLowerCase();
  if (SPAM_KEYWORDS.some((kw) => lower.includes(kw))) {
    reasons.push("Contains spam-like phrasing");
  }

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20) {
    const upper = letters.replace(/[^A-Z]/g, "");
    if (upper.length / letters.length > 0.7) {
      reasons.push("Excessive capitalization");
    }
  }

  if (/(.)\1{6,}/.test(trimmed)) {
    reasons.push("Repeated character spam pattern");
  }

  return { flagged: reasons.length > 0, reasons };
}
