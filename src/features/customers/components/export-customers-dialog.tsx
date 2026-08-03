"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, FileType } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FORMATS = [
  { value: "csv", label: "CSV", icon: FileText },
  { value: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { value: "pdf", label: "PDF", icon: FileType },
] as const;

export function ExportCustomersDialog({
  open,
  onOpenChange,
  selectedIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
}) {
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");

  function handleExport() {
    const params = new URLSearchParams({ format });
    if (selectedIds.length > 0) params.set("ids", selectedIds.join(","));
    window.open(`/api/customers/export?${params.toString()}`, "_blank");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Customers</DialogTitle>
          <DialogDescription>
            {selectedIds.length > 0
              ? `Export ${selectedIds.length} selected customers.`
              : "Export all active customers."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
                format === f.value ? "border-primary bg-accent-soft text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <f.icon className="size-5" />
              {f.label}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
