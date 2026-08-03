import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";
import { quotationCommentSchema } from "@/lib/validations/quotation";
import { getQuotationShareOrThrow } from "@/lib/quotation-share";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const share = await getQuotationShareOrThrow(token);
    const quotation = share.quotation;

    const data = quotationCommentSchema.parse(await req.json());
    const comment = await prisma.quotationComment.create({
      data: {
        quotationId: quotation.id,
        businessId: quotation.businessId,
        versionId: data.versionId || null,
        authorType: "CUSTOMER",
        body: data.body,
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
