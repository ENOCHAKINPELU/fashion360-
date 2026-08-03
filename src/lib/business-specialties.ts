// Suggested quick-add specialties (Part 4) — unlike CustomerTag/
// DesignCategory, these are deliberately NOT auto-seeded onto every new
// business: a BusinessSpecialty row means "this genuinely describes my
// business," so it should only exist once a business actually adds it
// (clicking a suggestion below, or typing a custom one — both go through
// the same POST /api/business/specialties).
export const SUGGESTED_BUSINESS_SPECIALTIES = [
  "Traditional Wear",
  "Agbada",
  "Kaftan",
  "Ankara",
  "Aso Ebi",
  "Wedding Wear",
  "Bridal Wear",
  "Suits",
  "Corporate Wear",
  "Casual Wear",
  "Streetwear",
  "Children's Wear",
  "Alterations",
  "Custom Design",
  "Other",
] as const;
