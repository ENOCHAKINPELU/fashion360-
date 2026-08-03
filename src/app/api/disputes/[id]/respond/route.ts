import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { respondToDispute } from "@/lib/dispute";

const schema = z.object({ body: z.string().trim().min(1, "Message is required") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { businessId, session } = await requireBusinessContext();
    const data = schema.parse(await req.json());

    const response = await prisma.$transaction((tx) =>
      respondToDispute(tx, { disputeId: id, businessId, authorType: "STAFF", authorId: session.user.id, body: data.body })
    );

    return NextResponse.json({ response }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
