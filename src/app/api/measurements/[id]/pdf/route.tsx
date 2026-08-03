import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { renderToBuffer } from "@react-pdf/renderer";
import { MeasurementSheetPdfDocument, type MeasurementSheetRow } from "@/lib/pdf/measurement-pdf";
import { measurementFieldCategoryOptions } from "@/lib/validations/measurement";

const CATEGORY_LABELS = Object.fromEntries(measurementFieldCategoryOptions.map((o) => [o.value, o.label]));

async function generatePdf(
  businessName: string,
  customerName: string,
  profileName: string,
  date: string,
  unit: string,
  fitPreference: string | undefined,
  rows: MeasurementSheetRow[],
  notes: string[]
) {
  return renderToBuffer(
    <MeasurementSheetPdfDocument
      businessName={businessName}
      customerName={customerName}
      profileName={profileName}
      date={date}
      unit={unit}
      fitPreference={fitPreference}
      rows={rows}
      notes={notes}
    />
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const measurement = await prisma.measurement.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        profile: true,
        notes: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!measurement) throw new ApiError(404, "Measurement not found");

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const types = await prisma.measurementType.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } });

    const values = measurement.values as Record<string, number>;
    const rows: MeasurementSheetRow[] = types
      .filter((t) => values[t.key] !== undefined)
      .map((t) => ({ category: CATEGORY_LABELS[t.category] ?? t.category, label: t.label, value: values[t.key] }));

    const buffer = await generatePdf(
      business.name,
      `${measurement.customer.firstName} ${measurement.customer.lastName}`,
      measurement.profile.name,
      measurement.createdAt.toISOString().slice(0, 10),
      measurement.unit,
      measurement.fitPreference ?? undefined,
      rows,
      measurement.notes.map((n) => n.body)
    );

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="measurement-sheet-${measurement.id}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
