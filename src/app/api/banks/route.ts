import { NextResponse } from "next/server";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { listBanks } from "@/lib/flutterwave";

// Powers the bank dropdown in payout-account-settings.tsx — real list from
// the platform's own Flutterwave account, so a business picks a bank
// instead of typing a CBN code from memory.
export async function GET() {
  try {
    await requireBusinessContext();
    const banks = await listBanks("NG");
    return NextResponse.json({ banks });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
