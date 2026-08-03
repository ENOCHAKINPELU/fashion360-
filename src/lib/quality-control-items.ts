// Pure constant, no server-only imports — safe to import from client
// components (quality-control.ts itself pulls in prisma/rbac and can't be).
export const DEFAULT_QC_ITEMS = [
  "Design Matches Approved Version",
  "Measurements Checked",
  "Stitching Checked",
  "Fabric Checked",
  "Color Checked",
  "Finishing Checked",
  "Accessories Checked",
  "Final Inspection Complete",
];
