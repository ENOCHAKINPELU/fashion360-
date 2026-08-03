import { NextResponse } from "next/server";
import { OCCASION_OPTIONS } from "@/lib/occasion-discovery";

export async function GET() {
  return NextResponse.json({ occasions: OCCASION_OPTIONS.map((o) => ({ key: o.key, label: o.label })) });
}
