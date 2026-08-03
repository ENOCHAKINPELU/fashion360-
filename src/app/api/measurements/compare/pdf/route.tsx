import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { renderToBuffer } from "@react-pdf/renderer";
import { MeasurementComparisonPdfDocument, type ComparisonColumn } from "@/lib/pdf/measurement-pdf";

async function generatePdf(
  businessName: string,
  customerName: string,
  fieldLabels: { key: string; label: string }[],
  columns: ComparisonColumn[]
) {
  return renderToBuffer(
    <MeasurementComparisonPdfDocument
      businessName={businessName}
      customerName={customerName}
      fieldLabels={fieldLabels}
      columns={columns}
    />
  );
}

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const idsParam = req.nextUrl.searchParams.get("ids");
    if (!idsParam) throw new ApiError(400, "ids is required");
    const ids = idsParam.split(",").filter(Boolean);

    const measurements = await prisma.measurement.findMany({
      where: { id: { in: ids }, businessId },
      orderBy: { createdAt: "asc" },
      include: { profile: { select: { name: true } }, customer: true },
    });
    if (measurements.length < 2) throw new ApiError(400, "Select at least 2 measurements to compare");

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const types = await prisma.measurementType.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } });

    const fieldLabels = types
      .filter((t) => measurements.some((m) => (m.values as Record<string, number>)[t.key] !== undefined))
      .map((t) => ({ key: t.key, label: t.label }));

    const columns: ComparisonColumn[] = measurements.map((m) => ({
      label: `${m.profile.name} (${m.createdAt.toISOString().slice(0, 10)})`,
      values: m.values as Record<string, number>,
    }));

    const buffer = await generatePdf(
      business.name,
      `${measurements[0].customer.firstName} ${measurements[0].customer.lastName}`,
      fieldLabels,
      columns
    );

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="measurement-comparison.pdf"',
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
