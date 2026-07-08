import { NextRequest, NextResponse } from "next/server";
import { requireBusinessContext, apiErrorResponse } from "@/lib/rbac";
import { getMeasurementEstimationProvider } from "@/lib/providers/measurement-estimation";
import { z } from "zod";

const estimateSchema = z.object({
  heightCm: z.coerce.number().positive(),
  weightKg: z.coerce.number().positive(),
  gender: z.string().min(1),
  frontImageUrl: z.string().min(1),
  sideImageUrl: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireBusinessContext();
    const body = await req.json();
    const input = estimateSchema.parse(body);

    const provider = getMeasurementEstimationProvider();
    const estimate = await provider.estimate(input);

    return NextResponse.json({ estimate });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
