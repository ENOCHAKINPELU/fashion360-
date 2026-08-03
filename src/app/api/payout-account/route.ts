import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireBusinessPermission, requireBusinessContext } from "@/lib/rbac";
import { payoutRecipientSchema } from "@/lib/validations/payout-recipient";
import { upsertPayoutRecipient, getPayoutRecipient } from "@/lib/payout-recipients";
import { prisma } from "@/lib/prisma";

// The business's own payout destination — same "MANAGE_PAYMENTS" gate the
// payment-gateway connection route uses, since this is equally
// money-movement-sensitive.
export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const recipient = await getPayoutRecipient(businessId);
    return NextResponse.json({ recipient });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessPermission("MANAGE_PAYMENTS");
    const data = payoutRecipientSchema.parse(await req.json());

    const { recipient, accountNameResolved, message } = await prisma.$transaction((tx) =>
      upsertPayoutRecipient(tx, { businessId, ...data, actorId: session.user.id })
    );

    return NextResponse.json({ recipient, accountNameResolved, message }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
