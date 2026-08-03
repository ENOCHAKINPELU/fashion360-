"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParsedImportRow } from "@/lib/customer-import";

interface PreviewResult {
  row: ParsedImportRow;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf: { firstName: string; lastName: string } | null;
}

interface PreviewResponse {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  results: PreviewResult[];
}

export function ImportCustomersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  function reset() {
    setPreview(null);
    setLoading(false);
    setImporting(false);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/customers/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not parse file");
      setPreview(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not parse file");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview) return;
    const rows = preview.results.filter((r) => r.errors.length === 0 && !r.isDuplicate).map((r) => r.row);
    if (rows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/customers/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(`Imported ${data.created} customers${data.skipped ? ` (${data.skipped} skipped)` : ""}`);
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file. We&apos;ll check for duplicates before importing.</DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center"
            onClick={() => inputRef.current?.click()}
            role="button"
          >
            <FileUp className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {loading ? "Parsing file..." : "Click to select a CSV or Excel file"}
            </p>
            <p className="text-xs text-muted-foreground">Expected columns: First Name, Last Name, Email, Phone...</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-success/10 text-success hover:bg-success/10">{preview.valid} ready</Badge>
              <Badge className="bg-warning/10 text-warning hover:bg-warning/10">{preview.duplicates} duplicates</Badge>
              <Badge className="bg-danger/10 text-danger hover:bg-danger/10">{preview.invalid} invalid</Badge>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.results.map((r) => (
                    <tr key={r.row.rowNumber}>
                      <td className="px-3 py-2 text-muted-foreground">{r.row.rowNumber}</td>
                      <td className="px-3 py-2 text-foreground">
                        {r.row.firstName} {r.row.lastName}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.row.email ?? "N/A"}</td>
                      <td className="px-3 py-2">
                        {r.errors.length > 0 ? (
                          <span className="flex items-center gap-1 text-danger">
                            <AlertTriangle className="size-3.5" /> {r.errors[0]}
                          </span>
                        ) : r.isDuplicate ? (
                          <span className="text-warning">Duplicate</span>
                        ) : (
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="size-3.5" /> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {preview && (
            <Button onClick={handleImport} disabled={importing || preview.valid === 0}>
              {importing ? "Importing..." : `Import ${preview.valid} customers`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
