import Link from "next/link";
import { Palette, ChevronRight } from "lucide-react";
import type { DesignPreviewStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { DesignProjectStatusBadge } from "@/features/design-projects/components/design-project-status-badge";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: undefined, label: "All" },
  { value: "DRAFT,DESIGN_IN_PROGRESS", label: "In Progress" },
  { value: "CUSTOMER_REVIEW,REVISION_IN_PROGRESS", label: "In Review" },
  { value: "CHANGES_REQUESTED", label: "Changes Requested" },
  { value: "DESIGN_LOCKED,CUSTOMER_APPROVED", label: "Approved" },
] as const;

export default async function DesignProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;
  const statusFilter = params.status;

  const projects = await prisma.designPreview.findMany({
    where: {
      businessId,
      orderId: null,
      ...(statusFilter ? { status: { in: statusFilter.split(",") as DesignPreviewStatus[] } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      customerProfile: { include: { user: { select: { name: true, email: true, image: true } } } },
      serviceRequest: { select: { requestCode: true } },
      assignedDesigner: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design Projects</h1>
        <p className="text-sm text-muted-foreground">
          From accepted service request to customer-approved design, ready for quotation.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/dashboard/design-projects?status=${f.value}` : "/dashboard/design-projects"}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value || (!statusFilter && !f.value)
                ? "border-primary bg-accent-soft text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No Design Projects Yet"
          description="Accept a service request, then start a design project from its detail page."
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const customerName = project.customerProfile?.user.name ?? project.customerProfile?.user.email ?? "Customer";
            return (
              <Link key={project.id} href={`/dashboard/design-projects/${project.id}`}>
                <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    {project.customerProfile?.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.customerProfile.user.image} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-primary">
                        {customerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                        <DesignProjectStatusBadge status={project.status} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {customerName} · {project.previewCode}
                        {project.serviceRequest ? ` · ${project.serviceRequest.requestCode}` : ""}
                        {project.assignedDesigner ? ` · Designer: ${project.assignedDesigner.name}` : ""} · Updated{" "}
                        {formatRelativeTime(project.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
