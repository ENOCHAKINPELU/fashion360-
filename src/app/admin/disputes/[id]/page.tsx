import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, User, Shirt, ShoppingBag, CreditCard, Truck, History, FileText, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminDisputeActions } from "@/features/admin/components/admin-dispute-actions";
import { DisputeResolveForm } from "@/features/admin/components/dispute-resolve-form";
import { getAdminDisputeDetail, TERMINAL_STATUSES } from "@/lib/admin-disputes";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import type { DisputeStatus, DisputePriority } from "@prisma/client";

const STATUS_BADGE: Record<DisputeStatus, string> = {
  OPEN: "bg-danger-soft text-danger",
  UNDER_REVIEW: "bg-warning-soft text-warning",
  WAITING_FOR_CUSTOMER: "bg-info-soft text-info",
  WAITING_FOR_DESIGNER: "bg-info-soft text-info",
  ESCALATED: "bg-danger-soft text-danger",
  RESOLVED: "bg-success-soft text-success",
  CLOSED: "bg-muted text-muted-foreground",
};

const PRIORITY_BADGE: Record<DisputePriority, string> = {
  NORMAL: "bg-muted text-muted-foreground",
  HIGH: "bg-warning-soft text-warning",
  URGENT: "bg-danger-soft text-danger",
};

const RESPONSE_LABEL: Record<string, string> = { STAFF: "Business", CUSTOMER: "Customer", SYSTEM: "Fashion360 (Admin)" };

// Admin Phase 9 dispute detail. Resolve is untouched — DisputeResolveForm
// posting to lib/dispute.ts's resolveDispute, exactly as before. Everything
// added this phase is either new read-only context (Payment/Delivery
// Summary, a merged Timeline) or one of the four new actions
// (AdminDisputeActions) — see lib/admin-disputes.ts.
export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const detail = await getAdminDisputeDetail(id, session?.user?.id);
  if (!detail) notFound();

  const { dispute, payment, delivery, maxRefundable } = detail;

  const timeline = [
    { id: "created", label: "Dispute opened", at: dispute.createdAt },
    ...dispute.evidence.map((e) => ({ id: `evidence_${e.id}`, label: `Evidence submitted by ${e.submittedByType.toLowerCase()}`, at: e.createdAt })),
    ...dispute.responses.map((r) => ({ id: `resp_${r.id}`, label: `${RESPONSE_LABEL[r.authorType] ?? r.authorType} responded`, at: r.createdAt })),
    ...(dispute.resolution ? [{ id: "resolved", label: `Resolved: ${dispute.resolution.resolutionType.replace(/_/g, " ")}`, at: dispute.resolution.resolvedAt }] : []),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dispute.order.orderCode}</h1>
            <Badge className={STATUS_BADGE[dispute.status] ?? "bg-muted text-muted-foreground"}>{dispute.status.replace(/_/g, " ")}</Badge>
            <Badge className={PRIORITY_BADGE[dispute.priority]}>{dispute.priority}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {dispute.business.name} · {dispute.customer.firstName} {dispute.customer.lastName} ({dispute.customer.email}) · {dispute.issueType.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-muted-foreground">Assigned to: {dispute.assignedAdmin?.name ?? "Unassigned"}</p>
        </div>
        <AdminDisputeActions disputeId={dispute.id} assignedAdminId={dispute.assignedAdminId} cancellable={!TERMINAL_STATUSES.includes(dispute.status)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Customer's Report */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4" /> Customer&apos;s Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{dispute.description}</p>
              <p className="text-xs text-muted-foreground">Reported {formatDate(dispute.createdAt)}</p>
            </CardContent>
          </Card>

          {/* Evidence & Uploaded Images */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" /> Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispute.evidence.length === 0 ? (
                <EmptyState icon={FileText} title="No evidence submitted" className="border-none py-8" />
              ) : (
                <div className="space-y-3">
                  {dispute.evidence.map((e) => (
                    <div key={e.id} className="text-sm">
                      <p className="text-foreground">
                        <span className="font-medium">{e.submittedByType}:</span> {e.description}
                      </p>
                      {(e.photos.length > 0 || e.videos.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {e.photos.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={`p${i}`} src={url} alt="" className="size-20 rounded-lg border border-border object-cover" />
                          ))}
                          {e.videos.map((url, i) => (
                            <a key={`v${i}`} href={url} target="_blank" rel="noreferrer" className="flex size-20 items-center justify-center rounded-lg border border-border text-xs text-primary hover:underline">
                              Video {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(e.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" /> Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispute.responses.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No messages yet" className="border-none py-8" />
              ) : (
                <div className="space-y-3">
                  {dispute.responses.map((r) => (
                    <div key={r.id} className="text-sm">
                      <p className="text-xs text-muted-foreground">
                        {RESPONSE_LABEL[r.authorType] ?? r.authorType}
                        {r.authorName ? ` (${r.authorName})` : ""} · {formatDate(r.createdAt)}
                      </p>
                      <p className="text-foreground">{r.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="size-4" /> Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-muted-foreground">
                Order Total: <span className="text-foreground">{formatCurrency(dispute.order.totalValue, "NGN")}</span>
              </p>
              <p className="text-muted-foreground">
                Amount Paid: <span className="text-foreground">{formatCurrency(dispute.order.amountPaid, "NGN")}</span>
              </p>
              <p className="text-muted-foreground">
                Order Status: <span className="text-foreground">{dispute.order.status.replace(/_/g, " ")}</span>
              </p>
              <Link href={`/admin/orders/${dispute.order.id}`} className="text-xs font-medium text-primary hover:underline">
                View full order →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Timeline */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {timeline.map((t) => (
                  <li key={t.id} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm text-foreground">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(t.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Customer / Designer */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Name</dt>
                  <dd className="text-foreground">
                    {dispute.customer.firstName} {dispute.customer.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="text-foreground">{dispute.customer.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{dispute.customer.phone ?? "—"}</dd>
                </div>
              </dl>
              {dispute.customerProfile && (
                <Link href={`/admin/customers/${dispute.customerProfile.id}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                  Full profile →
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Shirt className="size-4" /> Designer
                </span>
                <Link href={`/admin/businesses/${dispute.business.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground">{dispute.business.name}</CardContent>
          </Card>

          {/* Payment Summary (read-only) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" /> Payment Summary <span className="text-xs font-normal text-muted-foreground">(read-only)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!payment ? (
                <p className="text-sm text-muted-foreground">No successful payment on this order.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Amount</dt>
                    <dd className="text-foreground">{formatCurrency(payment.amount, payment.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd className="text-foreground">{payment.status}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Available to Refund</dt>
                    <dd className="text-foreground">{formatCurrency(maxRefundable, payment.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Reference</dt>
                    <dd className="font-mono text-xs text-foreground">{payment.providerReference ?? "—"}</dd>
                  </div>
                </dl>
              )}
              <Link href={`/admin/payments${payment ? `/${payment.id}` : ""}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                {payment ? "Full payment detail →" : "View payments →"}
              </Link>
            </CardContent>
          </Card>

          {/* Delivery Summary (read-only) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4" /> Delivery Summary <span className="text-xs font-normal text-muted-foreground">(read-only)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!delivery ? (
                <p className="text-sm text-muted-foreground">No delivery arranged on this order.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd className="text-foreground">{delivery.status.replace(/_/g, " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Courier</dt>
                    <dd className="text-foreground">{delivery.courierName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Delivered</dt>
                    <dd className="text-foreground">{delivery.deliveredAt ? formatDate(delivery.deliveredAt) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Customer Confirmed</dt>
                    <dd className="text-foreground">{delivery.customerConfirmedAt ? formatDate(delivery.customerConfirmedAt) : "Not yet"}</dd>
                  </div>
                </dl>
              )}
              {delivery && (
                <Link href={`/admin/deliveries/${delivery.id}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                  Full delivery detail →
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Resolution */}
          {dispute.resolution ? (
            <Card className="border-none border-success/20 bg-success-soft shadow-sm">
              <CardContent className="space-y-1 pt-6">
                <p className="text-sm font-medium text-success">Resolved: {dispute.resolution.resolutionType.replace(/_/g, " ")}</p>
                <p className="text-sm text-success">{dispute.resolution.notes}</p>
                {dispute.resolution.resolvedBy?.name && <p className="text-xs text-success/80">by {dispute.resolution.resolvedBy.name}</p>}
              </CardContent>
            </Card>
          ) : (
            !TERMINAL_STATUSES.includes(dispute.status) && <DisputeResolveForm disputeId={dispute.id} paymentId={payment?.id ?? null} maxRefundable={maxRefundable} />
          )}
        </div>
      </div>
    </div>
  );
}
