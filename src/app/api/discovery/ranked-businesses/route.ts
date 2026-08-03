import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/rbac";
import { getRankedBusinesses } from "@/lib/discovery-ranked";

export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const result = await getRankedBusinesses({ page, orderBy: { ranking: { score: "desc" } } });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
