import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { getDiscoveryFeed } from "@/lib/discovery-feed";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const feed = await getDiscoveryFeed(prisma, profile.id);
    return NextResponse.json(feed);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
