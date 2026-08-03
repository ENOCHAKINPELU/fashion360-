import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { DesignApprovalPdfDocument } from "@/lib/pdf/design-approval-pdf";
import { formatDate } from "@/lib/utils";

const CUSTOMIZATION_LABELS: { key: string; label: string }[] = [
  { key: "fabricNameSnapshot", label: "Fabric" },
  { key: "primaryColor", label: "Primary Color" },
  { key: "secondaryColor", label: "Secondary Color" },
  { key: "pattern", label: "Pattern" },
  { key: "sleeveStyle", label: "Sleeve Style" },
  { key: "neckline", label: "Neckline" },
  { key: "collarStyle", label: "Collar" },
  { key: "cuffStyle", label: "Cuff" },
  { key: "length", label: "Length" },
  { key: "buttonStyle", label: "Buttons" },
  { key: "embroidery", label: "Embroidery" },
  { key: "pocketStyle", label: "Pocket" },
  { key: "lining", label: "Lining" },
];

// Shared by both the staff-side and customer-share PDF routes, each of which
// does its own authorization check before calling this.
export async function buildDesignApprovalPdfBuffer(previewId: string) {
  const preview = await prisma.designPreview.findFirst({
    where: { id: previewId },
    include: {
      business: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
      order: { select: { orderCode: true } },
      approvalRecord: { include: { designerConfirmedBy: { select: { name: true } } } },
    },
  });
  if (!preview) throw new ApiError(404, "Design preview not found");
  if (!preview.approvalRecord) throw new ApiError(400, "This design has not been approved yet");

  const approvedVersion = await prisma.designVersion.findUnique({
    where: { id: preview.approvalRecord.approvedVersionId },
    include: { customization: true },
  });
  if (!approvedVersion) throw new ApiError(404, "Approved version not found");

  let measurementProfileName: string | undefined;
  if (preview.approvalRecord.measurementProfileId) {
    const profile = await prisma.measurementProfile.findUnique({
      where: { id: preview.approvalRecord.measurementProfileId },
      select: { name: true },
    });
    measurementProfileName = profile?.name;
  }

  const customization = (approvedVersion.customization ?? {}) as Record<string, unknown>;
  const customizationRows = CUSTOMIZATION_LABELS.filter((f) => customization[f.key]).map((f) => ({
    label: f.label,
    value: String(customization[f.key]),
  }));
  if (Array.isArray(customization.accessories) && customization.accessories.length > 0) {
    customizationRows.push({ label: "Accessories", value: customization.accessories.join(", ") });
  }

  const buffer = await renderToBuffer(
    <DesignApprovalPdfDocument
      businessName={preview.business.name}
      customerName={`${preview.customer.firstName} ${preview.customer.lastName}`}
      designerName={preview.approvalRecord.designerConfirmedBy?.name ?? "Customer-approved"}
      orderCode={preview.order?.orderCode ?? preview.previewCode}
      designName={preview.name}
      approvedVersionLabel={`Version ${approvedVersion.versionNumber}`}
      approvedAtLabel={formatDate(preview.approvalRecord.approvedAt)}
      previewImageUrl={approvedVersion.previewImageUrl ?? undefined}
      customizationRows={customizationRows}
      measurementProfileName={measurementProfileName}
      certificateId={preview.approvalRecord.id}
    />
  );

  return { buffer, previewCode: preview.previewCode };
}
