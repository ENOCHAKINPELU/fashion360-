"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { serviceCategoryOptions, type BusinessServiceInput } from "@/lib/validations/service";

const CATEGORY_LABELS = Object.fromEntries(serviceCategoryOptions.map((o) => [o.value, o.label]));

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  priceMin: string | null;
  priceMax: string | null;
  estimatedDurationDays: number | null;
  isActive: boolean;
}

const EMPTY: BusinessServiceInput = {
  name: "",
  description: "",
  category: "OTHER",
  priceMin: "",
  priceMax: "",
  estimatedDurationDays: "",
  isActive: true,
};

export function ServicesManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BusinessServiceInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  async function addService() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add service");
      toast.success("Service added");
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add service");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(service: Service) {
    const res = await fetch(`/api/business/services/${service.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    if (!res.ok) {
      toast.error("Could not update service");
      return;
    }
    router.refresh();
  }

  async function removeService(id: string) {
    const res = await fetch(`/api/business/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove service");
      return;
    }
    toast.success("Service removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Services</p>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Services Yet"
          description="Add the services you offer so customers can request them from your profile."
          className="py-8"
        />
      ) : (
        <ul className="space-y-2">
          {services.map((service) => (
            <li key={service.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{service.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[service.category] ?? service.category}
                    </Badge>
                    {!service.isActive && <Badge className="bg-muted text-muted-foreground hover:bg-muted">Inactive</Badge>}
                  </div>
                  {service.description && <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {(service.priceMin || service.priceMax) && (
                      <span>
                        {service.priceMin ? `From ${service.priceMin}` : ""}
                        {service.priceMax ? ` – ${service.priceMax}` : ""}
                      </span>
                    )}
                    {service.estimatedDurationDays && <span>~{service.estimatedDurationDays} days</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={service.isActive} onCheckedChange={() => toggleActive(service)} />
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-danger" onClick={() => removeService(service.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>Describe a service customers can request from your profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Bridal Wear" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as BusinessServiceInput["category"] }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceCategoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Price Min (optional)</Label>
                <Input type="number" min={0} value={form.priceMin} onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Price Max (optional)</Label>
                <Input type="number" min={0} value={form.priceMax} onChange={(e) => setForm((f) => ({ ...f, priceMax: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Duration (days, optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.estimatedDurationDays}
                onChange={(e) => setForm((f) => ({ ...f, estimatedDurationDays: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={addService} disabled={submitting || !form.name.trim()}>
              {submitting ? "Adding..." : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
