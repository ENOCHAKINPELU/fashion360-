import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { quotationCommentSchema } from "@/lib/validations/quotation";
import { getScopedQuotation } from "@/app/api/quotations/[id]/route";
import { notifyCustomer } from "@/lib/service-request-notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const quotation = await getScopedQuotation(businessId, id);

    const data = quotationCommentSchema.parse(await req.json());
    const comment = await prisma.quotationComment.create({
      data: {
        quotationId: id,
        businessId,
        versionId: data.versionId || null,
        authorType: "STAFF",
        authorId: session.user.id,
        body: data.body,
      },
      include: { author: { select: { name: true } } },
    });

    if (quotation.customerProfileId) {
      await notifyCustomer(prisma, {
        businessId,
        customerProfileId: quotation.customerProfileId,
        title: "New reply on your quotation",
        body: `${quotation.quotationNumber}: "${data.body.slice(0, 100)}"`,
        type: "info",
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
