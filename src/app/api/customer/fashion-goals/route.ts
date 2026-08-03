import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { fashionGoalSchema } from "@/lib/validations/personalization";
import { createCustomerFashionGoal, getOrCreateFashionGoalCatalog } from "@/lib/fashion-goals";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const [catalog, goals] = await Promise.all([
      getOrCreateFashionGoalCatalog(prisma),
      prisma.customerFashionGoal.findMany({ where: { customerProfileId: profile.id }, orderBy: { createdAt: "desc" }, include: { fashionGoal: true } }),
    ]);
    return NextResponse.json({ catalog: catalog.filter((g) => g.isActive), goals });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const data = fashionGoalSchema.parse(await req.json());
    const goal = await createCustomerFashionGoal(prisma, { customerProfileId: profile.id, fashionGoalKey: data.fashionGoalKey, customText: data.customText, occasion: data.occasion });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
