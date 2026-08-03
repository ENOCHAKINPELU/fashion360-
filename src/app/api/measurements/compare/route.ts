import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const idsParam = req.nextUrl.searchParams.get("ids");
    if (!idsParam) throw new ApiError(400, "ids is required");
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length < 2) throw new ApiError(400, "Select at least 2 measurements to compare");

    const measurements = await prisma.measurement.findMany({
      where: { id: { in: ids }, businessId },
      orderBy: { createdAt: "asc" },
      include: { profile: { select: { name: true } } },
    });
    if (measurements.length < 2) throw new ApiError(404, "One or more measurements were not found");

    const types = await prisma.measurementType.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } });

    const fields = types
      .filter((t) => measurements.some((m) => (m.values as Record<string, number>)[t.key] !== undefined))
      .map((t) => ({ key: t.key, label: t.label, category: t.category }));

    const columns = measurements.map((m) => ({
      id: m.id,
      label: `${m.profile.name} (${m.createdAt.toISOString().slice(0, 10)})`,
      date: m.createdAt,
      values: m.values as Record<string, number>,
    }));

    return NextResponse.json({ fields, columns });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
