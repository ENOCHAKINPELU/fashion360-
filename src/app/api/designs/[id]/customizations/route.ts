import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designCustomizationSchema } from "@/lib/validations/design";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    const customerId = req.nextUrl.searchParams.get("customerId");
    if (!customerId) throw new ApiError(400, "customerId is required");

    const design = await prisma.design.findFirst({ where: { id, businessId } });
    if (!design) throw new ApiError(404, "Design not found");

    const customization = await prisma.designCustomization.findUnique({
      where: { designId_customerId: { designId: id, customerId } },
      include: { fabric: true },
    });

    return NextResponse.json({ customization });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const design = await prisma.design.findFirst({ where: { id, businessId } });
    if (!design) throw new ApiError(404, "Design not found");

    const data = designCustomizationSchema.parse(await req.json());

    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const payload = {
      fabricId: data.fabricId || null,
      primaryColor: data.primaryColor || null,
      secondaryColor: data.secondaryColor || null,
      sleeveStyle: data.sleeveStyle || null,
      neckline: data.neckline || null,
      collarStyle: data.collarStyle || null,
      buttonStyle: data.buttonStyle || null,
      embroidery: data.embroidery || null,
      length: data.length || null,
      pocketStyle: data.pocketStyle || null,
      cuffStyle: data.cuffStyle || null,
      lining: data.lining || null,
      accessories: data.accessories,
      extraNotes: data.extraNotes || null,
    };

    const customization = await prisma.designCustomization.upsert({
      where: { designId_customerId: { designId: id, customerId: data.customerId } },
      create: { businessId, designId: id, customerId: data.customerId, ...payload },
      update: payload,
      include: { fabric: true },
    });

    return NextResponse.json({ customization });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
