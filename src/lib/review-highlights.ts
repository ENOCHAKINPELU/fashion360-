const CATEGORY_LABELS: Record<string, string> = {
  DESIGN_QUALITY: "Design quality",
  COMMUNICATION: "Communication",
  PROFESSIONALISM: "Professionalism",
  DELIVERY_TIMELINESS: "On-time delivery",
  VALUE_FOR_MONEY: "Value for money",
  CUSTOMER_EXPERIENCE: "Overall experience",
};

// Part 24: "if automated text analysis is not available, use category
// statistics instead" — no NLP/summarization is configured for this
// platform, so highlights are derived purely from real category-rating
// averages, never fabricated review text.
export function getReviewHighlights(categoryAverages: Record<string, number> | null, minRating = 4.3): string[] {
  if (!categoryAverages) return [];
  return Object.entries(categoryAverages)
    .filter(([, avg]) => avg >= minRating)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, avg]) => `Customers rate ${(CATEGORY_LABELS[category] ?? category).toLowerCase()} highly (${avg.toFixed(1)}★)`);
}
