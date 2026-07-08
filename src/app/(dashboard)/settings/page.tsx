import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const business = await prisma.business.findUnique({ where: { id: businessId } });

  return <SettingsClient business={JSON.parse(JSON.stringify(business))} />;
}
