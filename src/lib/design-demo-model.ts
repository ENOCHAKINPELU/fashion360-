// Single source of truth for the placeholder 3D model used to prove the
// design-preview 3D pipeline end-to-end before any real designer has
// uploaded a GLB (see scripts/make-demo-gown.mjs for how it was generated).
// Imported by prisma/seed.ts (via relative path) to attach it to seed data,
// and by the customer-facing viewers to decide whether to show a "Demo
// Model" badge instead of misrepresenting it as the designer's real work.
export const DEMO_MODEL_URL = "/models/demo/demo-gown.glb";
export const DEMO_MODEL_FORMAT = "GLB" as const;

export function isDemoModelUrl(url: string | null | undefined): boolean {
  return url === DEMO_MODEL_URL;
}
