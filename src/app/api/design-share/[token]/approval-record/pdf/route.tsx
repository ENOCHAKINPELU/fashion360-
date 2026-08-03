import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/rbac";
import { getShareOrThrow } from "@/lib/design-share";
import { buildDesignApprovalPdfBuffer } from "@/lib/pdf/design-approval-pdf-builder";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getShareOrThrow(token);

    const { buffer, previewCode } = await buildDesignApprovalPdfBuffer(share.preview.id);

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
