"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MeasurementFormDialog } from "@/components/dashboard/measurement-form-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MEASUREMENT_FIELDS } from "@/lib/validations/measurement";
import { STAGE_LABELS } from "@/lib/validations/order";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gender: string | null;
  birthday: string | null;
  preferredColors: string[];
  preferredFabrics: string[];
  stylePreferences: string[];
  specialNotes: string | null;
  measurements: Array<Record<string, unknown> & { id: string; label: string; source: string; createdAt: string }>;
  orders: Array<{ id: string; orderNumber: string; stage: string; createdAt: string }>;
  appointments: Array<{ id: string; type: string; status: string; startTime: string }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; amount: string; amountPaid: string }>;
  payments: Array<{ id: string; type: string; status: string; amount: string; createdAt: string }>;
};

const TABS = ["Profile", "Measurements", "Orders", "Appointments", "Payments"] as const;

export function CustomerDetailClient({ customer }: { customer: Customer }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  const [measurementDialogOpen, setMeasurementDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/customers" className="text-sm text-muted hover:text-foreground">
          ← Back to customers
        </Link>
        <h1 className="font-display mt-2 text-2xl text-foreground">{customer.name}</h1>
        <p className="text-sm text-muted">{customer.phone || customer.email || "No contact info"}</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === t ? "border-b-2 border-accent text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Profile" && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Address</p>
              <p className="text-sm text-foreground">{customer.address || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Birthday</p>
              <p className="text-sm text-foreground">
                {customer.birthday ? formatDate(customer.birthday) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Preferred colors</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {customer.preferredColors.length > 0
                  ? customer.preferredColors.map((c) => <Badge key={c}>{c}</Badge>)
                  : "—"}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Preferred fabrics</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {customer.preferredFabrics.length > 0
                  ? customer.preferredFabrics.map((c) => <Badge key={c}>{c}</Badge>)
                  : "—"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted">Special notes</p>
              <p className="text-sm text-foreground">{customer.specialNotes || "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "Measurements" && (
        <Card>
          <CardHeader>
            <CardTitle>Measurement history</CardTitle>
            <Button size="sm" onClick={() => setMeasurementDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add profile
            </Button>
          </CardHeader>
          <CardContent>
            {customer.measurements.length === 0 ? (
              <EmptyState icon={Ruler} title="No measurements saved yet" />
            ) : (
              <div className="space-y-4">
                {customer.measurements.map((m) => (
                  <div key={m.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.label}</p>
                        <p className="text-xs text-muted">{formatDate(m.createdAt)}</p>
                      </div>
                      <Badge tone={m.source === "AI_ESTIMATED" ? "info" : "neutral"}>
                        {m.source === "AI_ESTIMATED" ? "AI Estimated" : "Manual"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-5">
                      {MEASUREMENT_FIELDS.map((f) => (
                        <div key={f.key}>
                          <span className="text-muted">{f.label}: </span>
                          <span className="text-foreground">
                            {(m[f.key] as number | null) ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "Orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.orders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <div className="divide-y divide-border">
                {customer.orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between py-3 first:pt-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.orderNumber}</p>
                      <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                    </div>
                    <Badge tone="accent">
                      {STAGE_LABELS[o.stage as keyof typeof STAGE_LABELS] ?? o.stage}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "Appointments" && (
        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.appointments.length === 0 ? (
              <EmptyState title="No appointments yet" />
            ) : (
              <div className="divide-y divide-border">
                {customer.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div>
                      <p className="text-sm font-medium capitalize text-foreground">
                        {a.type.replace("_", " ").toLowerCase()}
                      </p>
                      <p className="text-xs text-muted">{formatDate(a.startTime, { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <Badge tone="neutral">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "Payments" && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.invoices.length === 0 ? (
                <EmptyState title="No invoices yet" />
              ) : (
                <div className="divide-y divide-border">
                  {customer.invoices.map((i) => (
                    <div key={i.id} className="flex items-center justify-between py-3 first:pt-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{i.invoiceNumber}</p>
                        <p className="text-xs text-muted">
                          {formatCurrency(i.amountPaid)} of {formatCurrency(i.amount)} paid
                        </p>
                      </div>
                      <Badge tone={i.status === "PAID" ? "success" : "warning"}>{i.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.payments.length === 0 ? (
                <EmptyState title="No payments recorded" />
              ) : (
                <div className="divide-y divide-border">
                  {customer.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-3 first:pt-0">
                      <div>
                        <p className="text-sm font-medium capitalize text-foreground">
                          {p.type.toLowerCase()}
                        </p>
                        <p className="text-xs text-muted">{formatDate(p.createdAt)}</p>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <MeasurementFormDialog
        open={measurementDialogOpen}
        onClose={() => setMeasurementDialogOpen(false)}
        customerId={customer.id}
      />
    </div>
  );
}
