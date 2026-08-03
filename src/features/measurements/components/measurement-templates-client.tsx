"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/shared/components/empty-state";
import { measurementFieldCategoryOptions } from "@/lib/validations/measurement";
import type { MeasurementTemplateItem, MeasurementTypeItem } from "@/features/measurements/types";

type FieldForm = {
  id?: string;
  label: string;
  category: MeasurementTypeItem["category"];
  unit: MeasurementTypeItem["unit"];
};

type TemplateForm = {
  id?: string;
  name: string;
  category: string;
  fields: Record<string, { selected: boolean; required: boolean }>;
};

const emptyFieldForm: FieldForm = { label: "", category: "CUSTOM", unit: "METRIC" };
const emptyTemplateForm: TemplateForm = { name: "", category: "", fields: {} };

function categoryLabel(category: MeasurementTypeItem["category"]) {
  return measurementFieldCategoryOptions.find((option) => option.value === category)?.label ?? category;
}

export function MeasurementTemplatesClient() {
  const [types, setTypes] = useState<MeasurementTypeItem[]>([]);
  const [templates, setTemplates] = useState<MeasurementTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyFieldForm);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplateForm);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const [typesRes, templatesRes] = await Promise.all([fetch("/api/measurements/types"), fetch("/api/measurements/templates")]);
      const [typesJson, templatesJson] = await Promise.all([typesRes.json(), templatesRes.json()]);
      if (!typesRes.ok) throw new Error(typesJson.error ?? "Could not load measurement fields");
      if (!templatesRes.ok) throw new Error(templatesJson.error ?? "Could not load templates");
      setTypes(typesJson.types ?? []);
      setTemplates(templatesJson.templates ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const [typesRes, templatesRes] = await Promise.all([fetch("/api/measurements/types"), fetch("/api/measurements/templates")]);
        const [typesJson, templatesJson] = await Promise.all([typesRes.json(), templatesRes.json()]);
        if (!typesRes.ok) throw new Error(typesJson.error ?? "Could not load measurement fields");
        if (!templatesRes.ok) throw new Error(templatesJson.error ?? "Could not load templates");
        if (!active) return;
        setTypes(typesJson.types ?? []);
        setTemplates(templatesJson.templates ?? []);
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitial();

    return () => {
      active = false;
    };
  }, []);

  const groupedTypes = useMemo(() => {
    return types.reduce<Record<string, MeasurementTypeItem[]>>((groups, type) => {
      groups[type.category] ??= [];
      groups[type.category].push(type);
      return groups;
    }, {});
  }, [types]);

  function openNewField() {
    setFieldForm(emptyFieldForm);
    setFieldOpen(true);
  }

  function openEditField(type: MeasurementTypeItem) {
    setFieldForm({ id: type.id, label: type.label, category: type.category, unit: type.unit });
    setFieldOpen(true);
  }

  function openNewTemplate() {
    setTemplateForm(emptyTemplateForm);
    setTemplateOpen(true);
  }

  function openEditTemplate(template: MeasurementTemplateItem) {
    setTemplateForm({
      id: template.id,
      name: template.name,
      category: template.category ?? "",
      fields: Object.fromEntries(
        template.fields.map((field) => [
          field.measurementType.id,
          { selected: true, required: field.required },
        ])
      ),
    });
    setTemplateOpen(true);
  }

  async function saveField() {
    if (!fieldForm.label.trim()) {
      toast.error("Field name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(fieldForm.id ? `/api/measurements/types/${fieldForm.id}` : "/api/measurements/types", {
        method: fieldForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: fieldForm.label.trim(),
          category: fieldForm.category,
          unit: fieldForm.unit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save field");
      toast.success(fieldForm.id ? "Field updated" : "Field created");
      setFieldOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteField(type: MeasurementTypeItem) {
    if (!confirm(`Delete "${type.label}"?`)) return;
    try {
      const res = await fetch(`/api/measurements/types/${type.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not delete field");
      toast.success("Field deleted");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  function toggleTemplateField(typeId: string, selected: boolean) {
    setTemplateForm((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [typeId]: { selected, required: selected ? (prev.fields[typeId]?.required ?? true) : false },
      },
    }));
  }

  function toggleTemplateRequired(typeId: string, required: boolean) {
    setTemplateForm((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [typeId]: { selected: true, required },
      },
    }));
  }

  async function saveTemplate() {
    const fields = Object.entries(templateForm.fields)
      .filter(([, state]) => state.selected)
      .map(([measurementTypeId, state]) => ({ measurementTypeId, required: state.required }));

    if (!templateForm.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (fields.length === 0) {
      toast.error("Select at least one measurement field");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(templateForm.id ? `/api/measurements/templates/${templateForm.id}` : "/api/measurements/templates", {
        method: templateForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateForm.name.trim(),
          category: templateForm.category.trim() || undefined,
          fields,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save template");
      toast.success(templateForm.id ? "Template updated" : "Template created");
      setTemplateOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTemplate(template: MeasurementTemplateItem) {
    if (!confirm(`Delete "${template.name}"?`)) return;
    try {
      const res = await fetch(`/api/measurements/templates/${template.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not delete template");
      toast.success("Template deleted");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-14 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading measurement setup
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="templates" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openNewField} className="gap-1.5">
              <Plus className="size-3.5" /> Field
            </Button>
            <Button onClick={openNewTemplate} className="gap-1.5">
              <Plus className="size-3.5" /> Template
            </Button>
          </div>
        </div>

        <TabsContent value="templates">
          {templates.length === 0 ? (
            <EmptyState icon={Plus} title="No templates yet" action={<Button onClick={openNewTemplate}>Create template</Button>} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="border-none shadow-sm">
                  <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        {template.name}
                        {template.isSystem && <Badge variant="outline">default</Badge>}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {template.category ?? "General"} - {template.fields.length} fields
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!template.isSystem && (
                        <>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEditTemplate(template)} aria-label={`Edit ${template.name}`}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteTemplate(template)} aria-label={`Delete ${template.name}`}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {template.fields.map((field) => (
                        <Badge key={field.id} variant={field.required ? "default" : "outline"}>
                          {field.measurementType.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fields">
          <div className="space-y-4">
            {Object.entries(groupedTypes).map(([category, items]) => (
              <Card key={category} className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>{categoryLabel(category as MeasurementTypeItem["category"])}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((type) => (
                      <div key={type.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.unit === "METRIC" ? "Centimeters" : "Inches"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {type.isSystem ? (
                            <Badge variant="outline">default</Badge>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon-sm" onClick={() => openEditField(type)} aria-label={`Edit ${type.label}`}>
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => deleteField(type)} aria-label={`Delete ${type.label}`}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={fieldOpen} onOpenChange={setFieldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fieldForm.id ? "Edit Field" : "New Field"}</DialogTitle>
            <DialogDescription>Custom fields appear in templates and manual measurement sessions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={fieldForm.label} onChange={(event) => setFieldForm((prev) => ({ ...prev, label: event.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={fieldForm.category}
                  onValueChange={(value) => setFieldForm((prev) => ({ ...prev, category: value as FieldForm["category"] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {measurementFieldCategoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={fieldForm.unit}
                  onValueChange={(value) => setFieldForm((prev) => ({ ...prev, unit: value as FieldForm["unit"] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="METRIC">Centimeters</SelectItem>
                    <SelectItem value="IMPERIAL">Inches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={saveField} disabled={submitting}>
              {submitting ? "Saving..." : "Save field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{templateForm.id ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>Choose the fields that should appear when a measurement session uses this template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={templateForm.name} onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={templateForm.category}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Men, Bridal, Native Wear"
                />
              </div>
            </div>
            <div className="max-h-[46vh] space-y-3 overflow-y-auto rounded-xl border border-border p-3">
              {types.map((type) => {
                const state = templateForm.fields[type.id] ?? { selected: false, required: true };
                return (
                  <div key={type.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                    <label className="flex min-w-0 items-center gap-2 text-sm">
                      <Checkbox checked={state.selected} onCheckedChange={(checked) => toggleTemplateField(type.id, checked === true)} />
                      <span className="truncate">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{categoryLabel(type.category)}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={state.selected && state.required}
                        disabled={!state.selected}
                        onCheckedChange={(checked) => toggleTemplateRequired(type.id, checked === true)}
                      />
                      Required
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={submitting}>
              {submitting ? "Saving..." : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
