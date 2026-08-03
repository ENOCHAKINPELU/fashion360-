"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GitCompare, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";
import type { MeasurementRecordItem } from "@/features/measurements/types";

const ALL = "ALL";

function customerName(measurement: MeasurementRecordItem) {
  return measurement.customer ? `${measurement.customer.firstName} ${measurement.customer.lastName}` : "Unknown customer";
}

export function MeasurementsBrowseClient() {
  const [measurements, setMeasurements] = useState<MeasurementRecordItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (status !== ALL) params.set("status", status);
        if (source !== ALL) params.set("source", source);

        const res = await fetch(`/api/measurements?${params.toString()}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load measurements");
        setMeasurements(json.measurements ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          toast.error(error instanceof Error ? error.message : "Something went wrong");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [search, status, source]);

  const compareHref = useMemo(() => `/dashboard/measurements/compare?ids=${selectedIds.join(",")}`, [selectedIds]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" placeholder="Search customer or profile" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending review</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sources</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="AI_ESTIMATED">Photo estimate</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline" disabled={selectedIds.length < 2} className="gap-1.5">
            <Link href={selectedIds.length >= 2 ? compareHref : "#"}>
              <GitCompare className="size-3.5" /> Compare
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-14 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading measurements
        </div>
      ) : measurements.length === 0 ? (
        <EmptyState icon={Search} title="No measurements found" description="Try another search or start a new measurement session." />
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Customer</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements.map((measurement) => (
                <TableRow key={measurement.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(measurement.id)}
                      onCheckedChange={() => toggleSelected(measurement.id)}
                      aria-label={`Select ${customerName(measurement)}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{customerName(measurement)}</TableCell>
                  <TableCell>{measurement.profile?.name ?? "Measurement profile"}</TableCell>
                  <TableCell>
                    <Badge variant={measurement.status === "APPROVED" ? "default" : "outline"}>
                      {measurement.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{measurement.source === "AI_ESTIMATED" ? "Photo estimate" : "Manual"}</TableCell>
                  <TableCell>{Object.keys(measurement.values ?? {}).length}</TableCell>
                  <TableCell>{formatDate(measurement.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/measurements/${measurement.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
