import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logCustomerActivity } from "@/lib/customer-activity";
import { z } from "zod";

const schema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  fileType: z.string().optional(),
  sizeBytes: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const data = schema.parse(await req.json());

    const file = await prisma.$transaction(async (tx) => {
      const created = await tx.customerFile.create({
        data: { customerId: id, ...data, uploadedById: session.user.id },
      });

      await logCustomerActivity(tx, {
        customerId: id,
        businessId,
        type: "FILE_UPLOADED",
        title: `File uploaded: ${data.name}`,
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
