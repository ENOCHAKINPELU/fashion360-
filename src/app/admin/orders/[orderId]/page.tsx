import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Shirt,
  Ruler,
  Factory,
  History,
  FileText,
  CreditCard,
  Truck,
  NotebookText,
  ClipboardList,
  AlertTriangle,
  BadgeCheck,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { AdminOrderNoteForm } from "@/features/admin/components/admin-order-note-form";
import { getAdminOrderDetail } from "@/lib/admin-orders";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const VERIFICATION_BADGE: Record<string, { label: string; className: string }> = {
  UNVERIFIED: { label: "Unverified", className: "bg-muted text-muted-foreground" },
  PENDING: { label: "Pending verification", className: "bg-warning-soft text-warning" },
  VERIFIED: { label: "Verified", className: "bg-success-soft text-success" },
  REJECTED: { label: "Verification rejected", className: "bg-danger-soft text-danger" },
  SUSPENDED: { label: "Suspended", className: "bg-danger-soft text-danger" },
};

const NOTE_CATEGORY_STYLES: Record<string, string> = {
  CUSTOMER: "bg-info-soft text-info",
  DESIGNER: "bg-accent-soft text-primary",
  PRODUCTION: "bg-warning-soft text-warning",
  FITTING: "bg-accent-soft text-secondary",
  ALTERATION: "bg-warning-soft text-warning",
  PRIVATE: "bg-muted text-muted-foreground",
  ADMIN: "bg-primary/10 text-primary",
};

const IMAGE_FILE_CATEGORIES = new Set(["DESIGN_IMAGE", "INSPIRATION", "SKETCH", "FABRIC_IMAGE", "FINAL_PHOTO"]);

function SectionEmpty({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <EmptyState icon={Icon} title={title} className="border-none py-8" />;
}

// Admin Phase 6 order detail — read-mostly (brief: Admin monitors
// operations, doesn't manually run every order). Every section below is a
// real, already-populated model (see lib/admin-orders.ts's comment on why
// this mirrors ORDER_DETAIL_INCLUDE's own groupings as its own query) —
// nothing here is fabricated to fill out the brief's section list. The one
// write action is the Admin Note form; everything else, including Payments
// and Delivery, is display-only per the brief's explicit "(Read-only)".
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const detail = await getAdminOrderDetail(orderId);
  if (!detail) notFound();

  const { order, attention, revisionCount } = detail;
  const verification = VERIFICATION_BADGE[order.business.verification?.status ?? "UNVERIFIED"] ?? VERIFICATION_BADGE.UNVERIFIED;
  const customerName = `${order.customer.firstName} ${order.customer.lastName}`.trim();
  const measurementProfileName = order.measurementProfile?.name ?? order.passportMeasurementProfile?.name ?? null;
  const measurementEntries = order.measurementSnapshot && typeof order.measurementSnapshot === "object" ? Object.entries(order.measurementSnapshot as Record<string, unknown>) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{order.orderCode}</h1>
              <Badge variant="outline">{order.status.replace(/_/g, " ")}</Badge>
              <Badge className={order.priority === "URGENT" ? "bg-danger-soft text-danger" : order.priority === "HIGH" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"}>
                {order.priority}
              </Badge>
              {attention && (
                <Badge className="gap-1 bg-warning-soft text-warning" title={attention.reason}>
                  <AlertTriangle className="size-3" /> Needs Attention
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {customerName} → {order.business.name}
            </p>
          </div>
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
            <p className="text-xs text-muted-foreground">Order Value</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(order.totalValue, "NGN")}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Order Date</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(order.orderDate)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Expected Completion</p>
            <p className="mt-1 text-sm text-foreground">{order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "Not set"}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Payment Status</p>
            <p className="mt-1 text-sm text-foreground">
              {order.paymentStatus.replace(/_/g, " ")} · {formatCurrency(order.amountPaid, "NGN")} paid
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Customer */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <User className="size-4" /> Customer
                </span>
                {order.customerProfile && (
                  <Link href={`/admin/customers/${order.customerProfile.id}`} className="text-xs font-medium text-primary hover:underline">
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
                    {customerName} <span className="font-mono text-[11px] text-muted-foreground">({order.customer.customerCode})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="text-foreground">{order.customer.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{order.customer.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Location</dt>
                  <dd className="text-foreground">{[order.customer.city, order.customer.state, order.customer.country].filter(Boolean).join(", ") || "—"}</dd>
                </div>
              </dl>
              {!order.customerProfile && <p className="mt-3 text-xs text-muted-foreground">This customer has no Fashion360 platform account — added directly by the business.</p>}
            </CardContent>
          </Card>

          {/* Designer */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Shirt className="size-4" /> Designer
                </span>
                <Link href={`/admin/businesses/${order.business.id}`} className="text-xs font-medium text-primary hover:underline">
                  Full profile
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Business</dt>
                  <dd className="text-foreground">{order.business.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Assigned Staff</dt>
                  <dd className="text-foreground">{order.assignedDesigner?.name ?? "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rating</dt>
                  <dd className="flex items-center gap-1 text-foreground">
                    {order.business.rating && order.business.rating.totalReviews > 0 ? (
                      <>
                        <Star className="size-3.5 fill-warning text-warning" /> {order.business.rating.averageRating.toFixed(1)}{" "}
                        <span className="text-xs text-muted-foreground">({order.business.rating.totalReviews})</span>
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
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4" /> Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.length === 0 ? (
                <SectionEmpty icon={ClipboardList} title="No items on this order" />
              ) : (
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{item.designNameSnapshot ?? item.customDesignDescription ?? "Custom design"}</p>
                        <span className="text-xs text-muted-foreground">Qty {item.quantity}</span>
                      </div>
                      {item.designCategorySnapshot && <p className="text-xs text-muted-foreground">{item.designCategorySnapshot}</p>}
                      {item.customization && (
                        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                          {item.customization.fabricNameSnapshot && (
                            <div>
                              <dt className="text-muted-foreground">Fabric</dt>
                              <dd className="text-foreground">{item.customization.fabricNameSnapshot}</dd>
                            </div>
                          )}
                          {item.customization.primaryColor && (
                            <div>
                              <dt className="text-muted-foreground">Color</dt>
                              <dd className="text-foreground">
                                {item.customization.primaryColor}
                                {item.customization.secondaryColor ? ` / ${item.customization.secondaryColor}` : ""}
                              </dd>
                            </div>
                          )}
                          {item.customization.pattern && (
                            <div>
                              <dt className="text-muted-foreground">Pattern</dt>
                              <dd className="text-foreground">{item.customization.pattern}</dd>
                            </div>
                          )}
                        </dl>
                      )}
                      {item.customization?.customInstructions && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Special instructions:</span> {item.customization.customInstructions}
                        </p>
                      )}
                      {item.customization?.referenceImages && item.customization.referenceImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.customization.referenceImages.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={url} alt="" className="size-16 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="size-4" /> Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {measurementEntries.length === 0 ? (
                <SectionEmpty icon={Ruler} title="No measurement snapshot recorded" />
              ) : (
                <>
                  {measurementProfileName && <p className="mb-2 text-xs text-muted-foreground">From profile: {measurementProfileName}</p>}
                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    {measurementEntries.map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs text-muted-foreground">{key}</dt>
                        <dd className="text-foreground">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </CardContent>
          </Card>

          {/* Production */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Factory className="size-4" /> Production
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.productionStages.length === 0 ? (
                <SectionEmpty icon={Factory} title="No production stages configured" />
              ) : (
                <div className="space-y-2">
                  {order.productionStages.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.startDate ? `Started ${formatDate(s.startDate)}` : "Not started"}
                          {s.completionDate ? ` · Completed ${formatDate(s.completionDate)}` : ""}
                          {s.completedBy?.name ? ` · ${s.completedBy.name}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{s.status.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" /> Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.files.length === 0 ? (
                <SectionEmpty icon={FileText} title="No files uploaded" />
              ) : (
                <div className="flex flex-wrap gap-3">
                  {order.files.map((f) =>
                    IMAGE_FILE_CATEGORIES.has(f.category) ? (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt={f.name} className="size-20 rounded-lg border border-border object-cover" />
                        <p className="mt-1 max-w-20 truncate text-[11px] text-muted-foreground">{f.name}</p>
                      </a>
                    ) : (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex w-40 flex-col gap-1 rounded-lg border border-border p-2 text-xs hover:bg-muted">
                        <span className="truncate font-medium text-foreground">{f.name}</span>
                        <span className="text-muted-foreground">{f.category.replace(/_/g, " ")}</span>
                      </a>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments (read-only) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" /> Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.payments.length === 0 ? (
                <SectionEmpty icon={CreditCard} title="No payments recorded" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                        <th className="py-2 pr-3 font-medium">Amount</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Method</th>
                        <th className="py-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.payments.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-3 tabular-nums text-foreground">{formatCurrency(p.amount, p.currency)}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline">{p.status.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{p.method.replace(/_/g, " ")}</td>
                          <td className="py-2 text-muted-foreground">{formatDate(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery (read-only) */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4" /> Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!order.delivery ? (
                <SectionEmpty icon={Truck} title="No delivery arranged yet" />
              ) : (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant="outline">{order.delivery.status.replace(/_/g, " ")}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Courier</dt>
                    <dd className="text-foreground">{order.delivery.courierName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Tracking</dt>
                    <dd className="text-foreground">{order.delivery.trackingNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Estimated Delivery</dt>
                    <dd className="text-foreground">{order.delivery.estimatedDeliveryDate ? formatDate(order.delivery.estimatedDeliveryDate) : "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Address</dt>
                    <dd className="text-foreground">{order.delivery.deliveryAddress}</dd>
                  </div>
                </dl>
              )}
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
              {order.timeline.length === 0 ? (
                <SectionEmpty icon={History} title="No timeline recorded" />
              ) : (
                <ul className="space-y-3">
                  {order.timeline.map((t) => (
                    <li key={t.id} className="flex gap-3">
                      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${t.status === "COMPLETED" ? "bg-primary" : "bg-muted-foreground/40"}`} />
                      <div>
                        <p className="text-sm text-foreground">{t.stage.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.status.replace(/_/g, " ")}
                          {t.occurredAt ? ` · ${formatRelativeTime(t.occurredAt)}` : ""}
                          {t.actor?.name ? ` · ${t.actor.name}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {revisionCount > 0 && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{revisionCount} alteration cycle(s) recorded on this order.</p>}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookText className="size-4" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AdminOrderNoteForm orderId={order.id} />
              {order.notes.length === 0 ? (
                <SectionEmpty icon={NotebookText} title="No notes yet" />
              ) : (
                <ul className="space-y-2">
                  {order.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-border p-2.5 text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge className={NOTE_CATEGORY_STYLES[n.category] ?? NOTE_CATEGORY_STYLES.DESIGNER}>{n.category === "ADMIN" ? "Admin (private)" : n.category}</Badge>
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

          {/* Audit History */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Audit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.activities.length === 0 ? (
                <SectionEmpty icon={History} title="No recorded activity" />
              ) : (
                <ul className="space-y-2">
                  {order.activities.map((a) => (
                    <li key={a.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                      <p className="text-foreground">{a.title}</p>
                      {a.description && <p className="text-muted-foreground">{a.description}</p>}
                      <p className="mt-1 text-muted-foreground">
                        {a.actor?.name ?? "System"} · {formatRelativeTime(a.createdAt)}
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
