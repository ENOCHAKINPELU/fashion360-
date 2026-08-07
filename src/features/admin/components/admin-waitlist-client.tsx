"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Palette, Download, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

interface WaitlistRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "CUSTOMER" | "DESIGNER";
  source: string | null;
  city: string | null;
  country: string | null;
  businessName: string | null;
  specialty: string | null;
  yearsExperience: number | null;
  portfolioUrl: string | null;
  createdAt: string;
}

// Polling, not a websocket subscription — same pragmatic pattern as the
// messaging inbox. "Real time" here means an admin watching this page sees
// a new signup within ~15s of it happening, without a manual refresh.
const POLL_MS = 15000;

function toCsv(rows: WaitlistRow[]) {
  const headers = ["Email", "Name", "Role", "Phone", "City", "Country", "Business Name", "Specialty", "Years Experience", "Portfolio URL", "Source", "Joined"];
  const lines = rows.map((r) =>
    [r.email, r.name ?? "", r.role, r.phone ?? "", r.city ?? "", r.country ?? "", r.businessName ?? "", r.specialty ?? "", r.yearsExperience ?? "", r.portfolioUrl ?? "", r.source ?? "", r.createdAt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

export function AdminWaitlistClient({
  initialSignups,
  initialCustomerCount,
  initialDesignerCount,
}: {
  initialSignups: WaitlistRow[];
  initialCustomerCount: number;
  initialDesignerCount: number;
}) {
  const [signups, setSignups] = useState(initialSignups);
  const [customerCount, setCustomerCount] = useState(initialCustomerCount);
  const [designerCount, setDesignerCount] = useState(initialDesignerCount);
  const [filter, setFilter] = useState<"ALL" | "CUSTOMER" | "DESIGNER">("ALL");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const inFlightRef = useRef(false);

  async function refresh() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/admin/waitlist");
      const data = await res.json();
      if (res.ok) {
        setSignups(data.signups ?? []);
        setCustomerCount(data.customerCount ?? 0);
        setDesignerCount(data.designerCount ?? 0);
        setLastRefreshed(new Date());
      }
    } catch {
      // Silent — next poll tries again.
    } finally {
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  function downloadCsv() {
    const rows = filter === "ALL" ? signups : signups.filter((s) => s.role === filter);
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fashion360-waitlist-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = filter === "ALL" ? signups : signups.filter((s) => s.role === filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <Users className="size-4.5" />
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-foreground">{customerCount}</p>
              <p className="text-xs text-muted-foreground">Customers waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <Palette className="size-4.5" />
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-foreground">{designerCount}</p>
              <p className="text-xs text-muted-foreground">Designers waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="size-3.5" />
            Updated {formatRelativeTime(lastRefreshed.toISOString())} · refreshes automatically
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(["ALL", "CUSTOMER", "DESIGNER"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-accent-soft text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f === "ALL" ? "All" : f === "CUSTOMER" ? "Customers" : "Designers"}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCsv} disabled={filtered.length === 0}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No signups yet" description="Waitlist signups from the landing page will appear here automatically." />
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id} className="border-none shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{s.name || s.email}</p>
                    <Badge variant="outline" className="shrink-0">{s.role === "DESIGNER" ? "Designer" : "Customer"}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.email}
                    {s.phone && ` · ${s.phone}`}
                    {s.city && ` · ${s.city}${s.country ? `, ${s.country}` : ""}`}
                  </p>
                  {s.role === "DESIGNER" && (s.businessName || s.specialty) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {s.businessName}
                      {s.specialty && ` · ${s.specialty}`}
                      {s.yearsExperience != null && ` · ${s.yearsExperience}y experience`}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(s.createdAt)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
