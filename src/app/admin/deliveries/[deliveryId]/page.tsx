import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Shirt,
  ShoppingBag,
  Package,
  Truck,
  History,
  AlertTriangle,
  TriangleAlert,
  BadgeCheck,
  Star,
  ShieldCheck,
  Camera,
  NotebookText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminDeliveryActions } from "@/features/admin/components/admin-delivery-actions";
import { AdminOrderNoteForm } from "@/features/admin/components/admin-order-note-form";
import { getAdminDeliveryDetail, STATUS_DISPLAY_LABELS } from "@/lib/admin-deliveries";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import type { DeliveryStatus } from "@prisma/client";

const VERIFICATION_BADGE: Record<string, { label: string; className: string }> = {
  UNVERIFIED: { label: "Unverified", className: "bg-muted text-muted-foreground" },
  PENDING: { label: "Pending verification", className: "bg-warning-soft text-warning" },
  VERIFIED: { label: "Verified", className: "bg-success-soft text-success" },
  REJECTED: { label: "Verification rejected", className: "bg-danger-soft text-danger" },
  SUSPENDED: { label: "Suspended", className: "bg-danger-soft text-danger" },
};

const STATUS_BADGE: Record<DeliveryStatus, string> = {
  CREATED: "bg-muted text-muted-foreground",
  COURIER_ASSIGNED: "bg-info-soft text-info",
  PICKUP_SCHEDULED: "bg-info-soft text-info",
  PICKED_UP: "bg-info-soft text-info",
  IN_TRANSIT: "bg-info-soft text-info",
  OUT_FOR_DELIVERY: "bg-warning-soft text-warning",
  DELIVERED: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  CANCELLED: "bg-muted text-muted-foreground",
  RETURNED: "bg-muted text-muted-foreground",
};

const NOTE_CATEGORY_STYLES: Record<string, string> = { ADMIN: "bg-primary/10 text-primary" };

// Admin Phase 8 delivery detail — read-mostly (same brief pattern every
// prior phase followed: Admin monitors logistics, doesn't run couriers).
// Every section is a real, already-populated Delivery/DeliveryEvent field
// except Delivery Proof, whose fields are genuinely new this phase — see
// lib/admin-deliveries.ts's schema comment on why they're nullable and
// what populates them today (nothing yet).
export default async function AdminDeliveryDetailPage({ params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params;
  const detail = await getAdminDeliveryDetail(deliveryId);
  if (!detail) notFound();

  const { delivery, attention, escalation, cancellable } = detail;
  const verification = VERIFICATION_BADGE[delivery.business.verification?.status ?? "UNVERIFIED"] ?? VERIFICATION_BADGE.UNVERIFIED;
  const customerName = `${delivery.order.customer.firstName} ${delivery.order.customer.lastName}`.trim();
  const hasProof = !!(delivery.recipientName || delivery.proofPhotoUrl || delivery.signatureUrl || delivery.deliveryLatitude != null);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/deliveries" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Deliveries
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{delivery.order.orderCode}</h1>
              <Badge className={STATUS_BADGE[delivery.status] ?? "bg-muted text-muted-foreground"}>{STATUS_DISPLAY_LABELS[delivery.status]}</Badge>
              {escalation.escalated && (
                <Badge className="gap-1 bg-danger-soft text-danger" title={escalation.reason ?? undefined}>
                  <TriangleAlert className="size-3" /> Escalated
                </Badge>
              )}
              {attention && !escalation.escalated && (
                <Badge className="gap-1 bg-warning-soft text-warning" title={attention.reason}>
                  <AlertTriangle className="size-3" /> Needs Attention
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {customerName} → {delivery.business.name}
            </p>
          </div>
          <AdminDeliveryActions deliveryId={delivery.id} cancellable={cancellable} escalated={escalation.escalated} hasCourier={!!(delivery.courierName || delivery.courierPhone)} />
        </div>
      </div>

      {escalation.escalated && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          <span>
            <strong>Escalated</strong> {escalation.since && `(${formatRelativeTime(escalation.since)})`} — {escalation.reason}
          </span>
        </div>
      )}
      {attention && !escalation.escalated && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/20 bg-warning-soft/40 px-4 py-3 text-sm text-warning">
          <span>
            <strong>Flagged:</strong> {attention.reason}
          </span>
          <span className="text-xs italic">{attention.recommendedAction}</span>
        </div>
      )}

      {/* Delivery Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Provider</p>
            <p className="mt-1 text-sm text-foreground">{delivery.provider === "MANUAL" ? "Manual" : "Mock"}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(delivery.createdAt)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Picked Up</p>
            <p className="mt-1 text-sm text-foreground">{delivery.pickedUpAt ? formatDate(delivery.pickedUpAt) : "Not yet"}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Estimated Delivery</p>
            <p className="mt-1 text-sm text-foreground">{delivery.estimatedDeliveryDate ? formatDate(delivery.estimatedDeliveryDate) : "Not set"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Order Information */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="size-4" /> Order Information
                </span>
                <Link href={`/admin/orders/${delivery.order.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full order
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Order</dt>
                  <dd className="text-foreground">{delivery.order.orderCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Order Status</dt>
                  <dd className="text-foreground">{delivery.order.status.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Order Value</dt>
                  <dd className="text-foreground">{formatCurrency(delivery.order.totalValue, "NGN")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Order Date</dt>
                  <dd className="text-foreground">{formatDate(delivery.order.orderDate)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <User className="size-4" /> Customer Information
                </span>
                {delivery.order.customerProfile && (
                  <Link href={`/admin/customers/${delivery.order.customerProfile.id}`} className="text-xs font-medium text-primary hover:underline">
                    Full profile
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Name</dt>
                  <dd className="text-foreground">
                    {customerName} <span className="font-mono text-[11px] text-muted-foreground">({delivery.order.customer.customerCode})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{delivery.customerContactPhone ?? delivery.order.customer.phone ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Delivery Address</dt>
                  <dd className="text-foreground">{delivery.deliveryAddress}</dd>
                </div>
              </dl>
              {!delivery.order.customerProfile && <p className="mt-3 text-xs text-muted-foreground">This customer has no Fashion360 platform account — added directly by the business.</p>}
            </CardContent>
          </Card>

          {/* Designer Information */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Shirt className="size-4" /> Designer Information
                </span>
                <Link href={`/admin/businesses/${delivery.business.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Business</dt>
                  <dd className="text-foreground">{delivery.business.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rating</dt>
                  <dd className="flex items-center gap-1 text-foreground">
                    {delivery.business.rating && delivery.business.rating.totalReviews > 0 ? (
                      <>
                        <Star className="size-3.5 fill-warning text-warning" /> {delivery.business.rating.averageRating.toFixed(1)}{" "}
                        <span className="text-xs text-muted-foreground">({delivery.business.rating.totalReviews})</span>
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
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Pickup Address</dt>
                  <dd className="text-foreground">{delivery.pickupAddress}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Courier Information */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4" /> Courier Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Courier</dt>
                  <dd className="text-foreground">{delivery.courierName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Courier Phone</dt>
                  <dd className="text-foreground">{delivery.courierPhone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Courier Reference</dt>
                  <dd className="font-mono text-xs text-foreground">{delivery.providerDeliveryId ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Delivery Cost</dt>
                  <dd className="text-foreground">{delivery.deliveryCost != null ? formatCurrency(delivery.deliveryCost, delivery.currency) : "—"}</dd>
                </div>
                {delivery.failureReason && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Failure Reason</dt>
                    <dd className="text-danger">{delivery.failureReason}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Tracking Information */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" /> Tracking Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Tracking Number</dt>
                  <dd className="text-foreground">{delivery.trackingNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Tracking Link</dt>
                  <dd className="text-foreground">
                    {delivery.trackingUrl ? (
                      <a href={delivery.trackingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        View on carrier site
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                {delivery.packageDescription && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Package</dt>
                    <dd className="text-foreground">{delivery.packageDescription}</dd>
                  </div>
                )}
                {delivery.packageWeightKg != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Weight</dt>
                    <dd className="text-foreground">{delivery.packageWeightKg} kg</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Delivery Proof */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="size-4" /> Delivery Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasProof ? (
                <EmptyState icon={Camera} title="Not provided by courier" description="MOCK/MANUAL — the only providers connected today — don't capture proof of delivery." className="border-none py-8" />
              ) : (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Recipient Name</dt>
                    <dd className="text-foreground">{delivery.recipientName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Delivered</dt>
                    <dd className="text-foreground">{delivery.deliveredAt ? formatDate(delivery.deliveredAt) : "—"}</dd>
                  </div>
                  {delivery.deliveryLatitude != null && delivery.deliveryLongitude != null && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">GPS Coordinates</dt>
                      <dd className="text-foreground">
                        <a
                          href={`https://www.google.com/maps?q=${delivery.deliveryLatitude},${delivery.deliveryLongitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {delivery.deliveryLatitude.toFixed(5)}, {delivery.deliveryLongitude.toFixed(5)}
                        </a>
                      </dd>
                    </div>
                  )}
                  {delivery.proofPhotoUrl && (
                    <div>
                      <dt className="mb-1 text-xs text-muted-foreground">Delivery Photo</dt>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={delivery.proofPhotoUrl} alt="Delivery proof" className="size-24 rounded-lg border border-border object-cover" />
                    </div>
                  )}
                  {delivery.signatureUrl && (
                    <div>
                      <dt className="mb-1 text-xs text-muted-foreground">Signature</dt>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={delivery.signatureUrl} alt="Recipient signature" className="h-24 w-40 rounded-lg border border-border bg-white object-contain" />
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Confirmation & escrow handoff */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4" /> Escrow Handoff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Delivery status never releases funds directly. Once this delivery is marked <span className="font-medium text-foreground">Delivered</span>, the Payment module decides payout
                eligibility separately — once the customer confirms receipt, or the confirmation window expires with no dispute.
              </p>
              {delivery.status === "DELIVERED" && (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Customer Confirmed</dt>
                    <dd className="text-foreground">{delivery.customerConfirmedAt ? formatDate(delivery.customerConfirmedAt) : "Not yet"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Confirmation Deadline</dt>
                    <dd className="text-foreground">{delivery.confirmationDeadline ? formatDate(delivery.confirmationDeadline) : "—"}</dd>
                  </div>
                </dl>
              )}
              <Link href={`/admin/payments?designerId=${delivery.business.id}`} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
                View payment &amp; escrow status →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Tracking Timeline */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {delivery.events.length === 0 ? (
                <EmptyState icon={History} title="No tracking updates yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-3">
                  {delivery.events.map((e) => (
                    <li key={e.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm text-foreground">{STATUS_DISPLAY_LABELS[e.status] ?? e.status.replace(/_/g, " ")}</p>
                        {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                        <p className="text-xs text-muted-foreground">
                          {e.location ? `${e.location} · ` : ""}
                          {formatRelativeTime(e.occurredAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {delivery.createdBy?.name && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Created by {delivery.createdBy.name}.</p>}
            </CardContent>
          </Card>

          {/* Notes — reuses Phase 6's admin-only OrderNote form/thread */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookText className="size-4" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AdminOrderNoteForm orderId={delivery.order.id} />
              {delivery.order.notes.length === 0 ? (
                <EmptyState icon={NotebookText} title="No notes yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-2">
                  {delivery.order.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-border p-2.5 text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge className={NOTE_CATEGORY_STYLES.ADMIN}>Admin (private)</Badge>
                      </div>
                      <p className="whitespace-pre-wrap text-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(n.createdAt)}
                        {n.author?.name ? ` · ${n.author.name}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
