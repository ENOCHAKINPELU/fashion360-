import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  User,
  Shirt,
  ClipboardList,
  MessageSquare,
  History,
  ShoppingBag,
  Inbox,
  AlertTriangle,
  BadgeCheck,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { ServiceRequestStatusBadge } from "@/features/discover/components/service-request-status-badge";
import { AdminRequestActions } from "@/features/admin/components/admin-request-actions";
import { getAdminRequestDetail } from "@/lib/admin-requests";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";

const VERIFICATION_BADGE: Record<string, { label: string; className: string }> = {
  UNVERIFIED: { label: "Unverified", className: "bg-muted text-muted-foreground" },
  PENDING: { label: "Pending verification", className: "bg-warning-soft text-warning" },
  VERIFIED: { label: "Verified", className: "bg-success-soft text-success" },
  REJECTED: { label: "Verification rejected", className: "bg-danger-soft text-danger" },
  SUSPENDED: { label: "Suspended", className: "bg-danger-soft text-danger" },
};

const RESPONSE_LABELS: Record<string, string> = {
  MESSAGE: "sent a message",
  ACCEPTED: "accepted the request",
  DECLINED: "declined the request",
  INFO_REQUESTED: "asked for more information",
  ALTERNATIVE_DATE_PROPOSED: "proposed a different date",
  CUSTOMER_ACCEPTED: "accepted",
  CUSTOMER_DECLINED: "declined",
};

function SectionEmpty({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <EmptyState icon={Icon} title={title} className="border-none py-8" />;
}

// Admin Phase 5 request detail — read-mostly (brief #1: Admin monitors and
// resolves, doesn't manually run every request). Customer Requirements
// below shows exactly the fields ServiceRequest actually stores
// (description / preferred date & time / location preference / budget
// range / additional notes / attachments) — there's no separate structured
// clothing-type/style/color/fabric/measurements data in the schema today,
// so nothing here fabricates fields that don't exist; see the Phase 5
// report's Known Limitations.
export default async function AdminRequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const detail = await getAdminRequestDetail(requestId);
  if (!detail) notFound();

  const { request, timeline, customerOrders, customerRequests, designerOrders, attention, cancellable } = detail;
  const verification = VERIFICATION_BADGE[request.business.verification?.status ?? "UNVERIFIED"] ?? VERIFICATION_BADGE.UNVERIFIED;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/requests" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Requests
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{request.requestCode}</h1>
              <ServiceRequestStatusBadge status={request.status} />
              {attention ? (
                <Badge className="gap-1 bg-warning-soft text-warning" title={attention.reason}>
                  <AlertTriangle className="size-3" /> Needs Attention
                </Badge>
              ) : (
                <Badge variant="outline">Normal priority</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {request.customerProfile.user.name ?? request.customerProfile.user.email} → {request.business.name} · {request.service?.name ?? "General inquiry"}
            </p>
          </div>
          <AdminRequestActions requestId={request.id} cancellable={cancellable} />
        </div>
      </div>

      {attention && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning-soft/40 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            <strong>Flagged:</strong> {attention.reason}
          </span>
        </div>
      )}

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(request.createdAt)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Last Updated</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(request.updatedAt)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Current Status</p>
            <p className="mt-1 text-sm text-foreground">{request.status.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Priority</p>
            <p className="mt-1 text-sm text-foreground">{attention ? "High" : "Normal"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Customer Information (#7) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <User className="size-4" /> Customer Information
                </span>
                <Link href={`/admin/customers/${request.customerProfile.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Name</dt>
                  <dd className="text-foreground">{request.customerProfile.user.name ?? "Unnamed customer"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="text-foreground">{request.customerProfile.user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{request.customerProfile.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Location</dt>
                  <dd className="text-foreground">{[request.customerProfile.city, request.customerProfile.state, request.customerProfile.country].filter(Boolean).join(", ") || "—"}</dd>
                </div>
              </dl>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Previous orders with this designer</p>
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {customerOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                        <span className="text-foreground">{o.orderCode}</span>
                        <span className="text-muted-foreground">{formatDate(o.orderDate)}</span>
                        <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                        <span className="tabular-nums text-foreground">{formatCurrency(o.totalValue, "NGN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Other requests to this designer</p>
                {customerRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {customerRequests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                        <span className="text-foreground">{r.requestCode}</span>
                        <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
                        <Badge variant="outline">{r.status.replace(/_/g, " ")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Designer Information (#8) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Shirt className="size-4" /> Designer Information
                </span>
                <Link href={`/admin/businesses/${request.business.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Business</dt>
                  <dd className="text-foreground">{request.business.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Specialization</dt>
                  <dd className="text-foreground">{request.business.businessType.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rating</dt>
                  <dd className="flex items-center gap-1 text-foreground">
                    {request.business.rating && request.business.rating.totalReviews > 0 ? (
                      <>
                        <Star className="size-3.5 fill-warning text-warning" /> {request.business.rating.averageRating.toFixed(1)}{" "}
                        <span className="text-xs text-muted-foreground">({request.business.rating.totalReviews})</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No reviews</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Verification</dt>
                  <dd>
                    <Badge className={verification.className}>
                      <BadgeCheck className="size-3" /> {verification.label}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Designer&apos;s recent orders</p>
                {designerOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {designerOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                        <span className="text-foreground">{o.orderCode}</span>
                        <span className="text-muted-foreground">{formatDate(o.orderDate)}</span>
                        <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                        <span className="tabular-nums text-foreground">{formatCurrency(o.totalValue, "NGN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Requirements (#9) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4" /> Customer Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              </dl>
              {request.additionalNotes && (
                <div>
                  <p className="text-xs text-muted-foreground">Additional Notes</p>
                  <p className="text-sm text-foreground">{request.additionalNotes}</p>
                </div>
              )}
              {request.attachments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Inspiration Images</p>
                  <div className="flex flex-wrap gap-2">
                    {request.attachments.map((a) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={a.id} src={a.imageUrl} alt="" className="size-20 rounded-lg object-cover" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation — read-only view of the real, existing thread
              (ServiceRequestResponse) rather than a separate messaging
              system (#15). Admin has no businessId, so it can't visit the
              business's own /dashboard/service-requests/[id] page (that
              page is strictly businessId-scoped); rendering the same thread
              here, read-only, is how Admin gets to "the relevant
              conversation" without a new communication platform. */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" /> Conversation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.responses.length === 0 ? (
                <SectionEmpty icon={MessageSquare} title="No messages yet" />
              ) : (
                <ul className="space-y-3">
                  {request.responses.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border bg-background p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {r.actorType === "BUSINESS" ? (r.author?.name ?? "Designer") : (request.customerProfile.user.name ?? "Customer")} {RESPONSE_LABELS[r.type] ?? "responded"}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(r.createdAt)}</span>
                      </div>
                      {r.message && <p className="mt-1 text-muted-foreground">{r.message}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Timeline (#10) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {timeline.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm text-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor} · {formatRelativeTime(event.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Status History (#16) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Inbox className="size-4" /> Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.statusHistory.length === 0 ? (
                <SectionEmpty icon={Inbox} title="No status changes recorded" />
              ) : (
                <div className="space-y-2">
                  {request.statusHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                      <Badge variant="outline">{h.status.replace(/_/g, " ")}</Badge>
                      <span className="text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reassignment limitation (#14) — reported, not built. */}
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <p className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <ShoppingBag className="size-3.5" /> Reassignment
              </p>
              <p className="text-xs text-muted-foreground">
                Not supported. A request belongs to the designer the customer chose — its conversation, notifications, and request code are all scoped to that one business. Moving it to a
                different designer isn&apos;t a controlled action on the existing model; it would need a new product workflow, out of scope for this phase.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
