import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceRequestStatusBadge } from "@/features/discover/components/service-request-status-badge";
import { ServiceRequestActions } from "@/features/discover/components/service-request-actions";
import { ConsultationPrompt } from "@/features/appointments/components/consultation-prompt";
import { JourneyTracker } from "@/features/appointments/components/journey-tracker";
import { getServiceRequestAwaitingActor } from "@/lib/service-request-status";
import { computeCustomerJourney } from "@/lib/customer-journey";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { DesignProjectStatusBadge } from "@/features/design-projects/components/design-project-status-badge";

const STATUS_HISTORY_LABELS: Record<string, string> = {
  DRAFT: "Request Created",
  SUBMITTED: "Request Submitted",
  RECEIVED: "Business Viewed Your Request",
  UNDER_REVIEW: "Business Responded",
  ACCEPTED: "Request Accepted: Connection Established",
  DECLINED: "Request Declined",
  CANCELLED: "Request Cancelled",
  EXPIRED: "Request Expired",
  CONVERTED_TO_APPOINTMENT: "Converted to Appointment",
  CONVERTED_TO_ORDER: "Converted to Order",
};

const RESPONSE_LABELS: Record<string, string> = {
  MESSAGE: "sent a message",
  ACCEPTED: "accepted the request",
  DECLINED: "declined the request",
  INFO_REQUESTED: "asked for more information",
  ALTERNATIVE_DATE_PROPOSED: "proposed a different date",
  CUSTOMER_ACCEPTED: "accepted",
  CUSTOMER_DECLINED: "declined",
}

export default async function CustomerServiceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireCustomerContext();

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      business: { select: { name: true, logoUrl: true, profile: { select: { username: true } } } },
      service: { select: { name: true } },
      attachments: true,
      responses: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      appointments: { select: { id: true } },
      designPreviews: { select: { id: true, name: true, status: true }, take: 1 },
    },
  });

  if (!request || request.customerProfileId !== profile.id) notFound();

  const journey = await computeCustomerJourney(prisma, { customerProfileId: profile.id, businessId: request.businessId });

  const awaiting = getServiceRequestAwaitingActor(request.status, request.responses);
  const lastBusinessResponse = [...request.responses].filter((r) => r.actorType === "BUSINESS").at(-1);
  const canAccept = awaiting === "customer" && lastBusinessResponse?.type === "ACCEPTED";

  return (
    <div className="space-y-6">
      <Link href="/account/requests" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to My Requests
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{request.requestCode}</h1>
          <p className="text-sm text-muted-foreground">
            {request.business.name} · {request.service?.name ?? "General inquiry"}
          </p>
        </div>
        <ServiceRequestStatusBadge status={request.status} />
      </div>

      {request.status === "ACCEPTED" && request.appointments.length === 0 && (
        <ConsultationPrompt businessId={request.businessId} businessName={request.business.name} serviceRequestId={request.id} />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardContent className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Your Request</p>
              <p className="text-sm text-foreground">{request.description}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {request.preferredDate && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Preferred Date</dt>
                    <dd className="text-foreground">
                      {formatDate(request.preferredDate)} {request.preferredTime ?? ""}
                    </dd>
                  </div>
                )}
                {request.locationPreference && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Location Preference</dt>
                    <dd className="text-foreground">{request.locationPreference}</dd>
                  </div>
                )}
                {(request.budgetMin || request.budgetMax) && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Budget</dt>
                    <dd className="text-foreground">
                      {request.budgetMin?.toString() ?? "N/A"} – {request.budgetMax?.toString() ?? "N/A"}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Submitted</dt>
                  <dd className="text-foreground">{formatDate(request.createdAt)}</dd>
                </div>
              </dl>
              {request.additionalNotes && (
                <div>
                  <dt className="text-xs text-muted-foreground">Additional Notes</dt>
                  <dd className="text-sm text-foreground">{request.additionalNotes}</dd>
                </div>
              )}
              {request.attachments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Inspiration Images</p>
                  <div className="flex flex-wrap gap-2">
                    {request.attachments.map((a) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={a.id} src={a.imageUrl} alt="" className="size-16 rounded-lg object-cover" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Conversation</p>
              {request.responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No responses yet.</p>
              ) : (
                <ul className="space-y-3">
                  {request.responses.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {r.actorType === "BUSINESS" ? request.business.name : "You"} {RESPONSE_LABELS[r.type] ?? "responded"}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(r.createdAt)}</span>
                      </div>
                      {r.message && <p className="mt-1 text-muted-foreground">{r.message}</p>}
                      {r.proposedDate && <p className="mt-1 text-xs text-muted-foreground">Proposed date: {formatDate(r.proposedDate)}</p>}
                      {(r.estimatedPriceMin || r.estimatedPriceMax) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Estimated: {r.estimatedPriceMin?.toString() ?? "N/A"} – {r.estimatedPriceMax?.toString() ?? "N/A"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <ServiceRequestActions requestId={request.id} status={request.status} canAccept={canAccept} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {request.designPreviews.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardContent>
                <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Design Project</p>
                <Link
                  href={`/account/design-projects/${request.designPreviews[0].id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 hover:bg-muted"
                >
                  <span className="truncate text-sm font-medium text-foreground">{request.designPreviews[0].name}</span>
                  <DesignProjectStatusBadge status={request.designPreviews[0].status} />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm">
            <CardContent>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Your Journey</p>
              <JourneyTracker steps={journey} />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Timeline</p>
              <ul className="space-y-3">
                {request.statusHistory.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm text-foreground">{STATUS_HISTORY_LABELS[event.status] ?? event.status}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
