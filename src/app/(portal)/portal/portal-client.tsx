"use client";

import { useState } from "react";
import { Plus, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookAppointmentDialog } from "@/components/portal/book-appointment-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/validations/order";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validations/appointment";
import { MEASUREMENT_FIELDS } from "@/lib/validations/measurement";

type PortalData = {
  name: string;
  orders: Array<{ id: string; orderNumber: string; stage: keyof typeof STAGE_LABELS; createdAt: string }>;
  measurements: Array<Record<string, unknown> & { id: string; label: string; source: string; createdAt: string }>;
  appointments: Array<{ id: string; type: keyof typeof APPOINTMENT_TYPE_LABELS; status: string; startTime: string }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; amount: string; amountPaid: string }>;
  notifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
};

const TABS = ["Overview", "Orders", "Measurements", "Appointments", "Invoices"] as const;

export function PortalClient({ data }: { data: PortalData }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [bookOpen, setBookOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Welcome, {data.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted">Your orders, measurements, and appointments in one place.</p>
        </div>
        <Button onClick={() => setBookOpen(true)}>
          <Plus className="h-4 w-4" /> Book appointment
        </Button>
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

      {tab === "Overview" && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {data.appointments.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing scheduled" />
              ) : (
                <div className="divide-y divide-border">
                  {data.appointments.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-3 first:pt-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{APPOINTMENT_TYPE_LABELS[a.type]}</p>
                        <p className="text-xs text-muted">
                          {formatDate(a.startTime, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                      <Badge tone="neutral">{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {data.notifications.length === 0 ? (
                <EmptyState title="You're all caught up" />
              ) : (
                <div className="space-y-4">
                  {data.notifications.map((n) => (
                    <div key={n.id}>
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted">{formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "Orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {data.orders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <div className="divide-y divide-border">
                {data.orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.orderNumber}</p>
                      <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                    </div>
                    <Badge tone="accent">{STAGE_LABELS[o.stage]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "Measurements" && (
        <Card>
          <CardHeader>
            <CardTitle>Measurement history</CardTitle>
          </CardHeader>
          <CardContent>
            {data.measurements.length === 0 ? (
              <EmptyState title="No measurements on file yet" />
            ) : (
              <div className="space-y-4">
                {data.measurements.map((m) => (
                  <div key={m.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{m.label}</p>
                      <Badge tone={m.source === "AI_ESTIMATED" ? "info" : "neutral"}>
                        {m.source === "AI_ESTIMATED" ? "AI Estimated" : "Manual"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-5">
                      {MEASUREMENT_FIELDS.map((f) => (
                        <div key={f.key}>
                          <span className="text-muted">{f.label}: </span>
                          <span className="text-foreground">{(m[f.key] as number | null) ?? "—"}</span>
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

      {tab === "Appointments" && (
        <Card>
          <CardHeader>
            <CardTitle>All appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.appointments.length === 0 ? (
              <EmptyState title="No appointments yet" />
            ) : (
              <div className="divide-y divide-border">
                {data.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{APPOINTMENT_TYPE_LABELS[a.type]}</p>
                      <p className="text-xs text-muted">
                        {formatDate(a.startTime, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <Badge tone="neutral">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "Invoices" && (
        <Card>
          <CardHeader>
            <CardTitle>Invoices & payments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.invoices.length === 0 ? (
              <EmptyState title="No invoices yet" />
            ) : (
              <div className="divide-y divide-border">
                {data.invoices.map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{i.invoiceNumber}</p>
                      <p className="text-xs text-muted">
                        {formatCurrency(i.amountPaid)} of {formatCurrency(i.amount)} paid
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={i.status === "PAID" ? "success" : "warning"}>{i.status}</Badge>
                      <a href={`/api/portal/invoices/${i.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent">
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <BookAppointmentDialog open={bookOpen} onClose={() => setBookOpen(false)} />
    </div>
  );
}
