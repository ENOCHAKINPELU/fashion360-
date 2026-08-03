import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { buildDesignApprovalPdfBuffer } from "@/lib/pdf/design-approval-pdf-builder";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedPreview(businessId, id);

    const { buffer, previewCode } = await buildDesignApprovalPdfBuffer(id);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="design-approval-${previewCode}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
