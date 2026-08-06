import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { loadCustomerQuotation } from "@/lib/quotation-project";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const quotation = await loadCustomerQuotation(id, profile.id);

    const [versions, comments, business, designPreview] = await Promise.all([
      prisma.quotationVersion.findMany({
        where: { quotationId: id },
        orderBy: { versionNumber: "desc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.quotationComment.findMany({
        where: { quotationId: id },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      }),
      prisma.business.findUnique({ where: { id: quotation.businessId }, select: { id: true, name: true, logoUrl: true, email: true, phone: true, currency: true } }),
      quotation.designPreviewId
        ? prisma.designPreview.findUnique({
            where: { id: quotation.designPreviewId },
            select: {
              id: true,
              name: true,
              previewCode: true,
              versions: {
                where: { status: "APPROVED" },
                take: 1,
                select: {
                  id: true,
                  versionNumber: true,
                  previewImageUrl: true,
                  model: { select: { url: true, format: true } },
                  textures: { include: { fabricLibraryItem: true } },
                },
              },
            },
          })
        : null,
    ]);

    const measurementVersion = quotation.measurementVersionId
      ? await prisma.measurementVersion.findUnique({ where: { id: quotation.measurementVersionId }, select: { values: true, versionNumber: true } })
      : null;

    return NextResponse.json({ quotation, versions, comments, business, designPreview, measurementVersion });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
