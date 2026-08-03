import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { CustomerDesignProjectClient } from "@/features/design-projects/components/customer-design-project-client";

export default async function CustomerDesignProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireCustomerContext();

  const project = await prisma.designPreview.findUnique({ where: { id }, select: { id: true, customerProfileId: true } });
  if (!project || project.customerProfileId !== profile.id) notFound();

  return <CustomerDesignProjectClient projectId={id} />;
}
