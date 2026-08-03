"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/shared/components/image-upload";
import { CustomerTagBadge } from "@/features/customers/components/customer-tag-badge";
import {
  customerFormSchema,
  type CustomerFormInput,
  genderOptions,
  statusOptions,
  preferredCommunicationOptions,
} from "@/lib/validations/customer";

interface CustomerTagOption {
  id: string;
  name: string;
  color: string | null;
}

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  customerId?: string;
  defaultValues?: Partial<CustomerFormInput>;
  defaultTagIds?: string[];
  onSaved?: () => void;
}

const EMPTY_DEFAULTS: CustomerFormInput = {
  profilePhotoUrl: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  whatsapp: "",
  occupation: "",
  country: "",
  state: "",
  city: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  referralSource: "",
  tags: [],
  specialNotes: "",
  status: "LEAD",
  isVip: false,
  dateOfBirth: "",
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  mode,
  customerId,
  defaultValues,
  defaultTagIds,
  onSaved,
}: CustomerFormDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [tagOptions, setTagOptions] = useState<CustomerTagOption[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues, tags: defaultTagIds ?? [] },
  });

  useEffect(() => {
    if (!open) return;
    reset({ ...EMPTY_DEFAULTS, ...defaultValues, tags: defaultTagIds ?? [] });
    fetch("/api/customers/tags")
      .then((res) => res.json())
      .then((data) => setTagOptions(data.tags ?? []))
      .catch(() => setTagOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  const selectedTags = watch("tags");

  function toggleTag(id: string) {
    const next = selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id];
    setValue("tags", next, { shouldDirty: true });
  }

  async function onSubmit(data: CustomerFormInput) {
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/customers" : `/api/customers/${customerId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");

      toast.success(mode === "create" ? "Customer added" : "Customer updated");
      onOpenChange(false);
      onSaved?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Customer" : "Edit Customer"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new customer profile for your business."
              : "Update this customer's profile details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label className="mb-2 block">Profile Photo</Label>
            <ImageUpload
              value={watch("profilePhotoUrl")}
              onChange={(url) => setValue("profilePhotoUrl", url, { shouldDirty: true })}
              folder="avatars"
              shape="circle"
              label="Upload photo"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" error={errors.firstName?.message} required>
              <Input {...register("firstName")} />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message} required>
              <Input {...register("lastName")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Phone Number" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+234 800 000 0000" />
            </Field>
            <Field label="WhatsApp Number" error={errors.whatsapp?.message}>
              <Input {...register("whatsapp")} placeholder="+234 800 000 0000" />
            </Field>
            <Field label="Gender">
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Date of Birth">
              <Input type="date" {...register("dateOfBirth")} />
            </Field>
            <Field label="Occupation">
              <Input {...register("occupation")} />
            </Field>
            <Field label="Country">
              <Input {...register("country")} />
            </Field>
            <Field label="State">
              <Input {...register("state")} />
            </Field>
            <Field label="City">
              <Input {...register("city")} />
            </Field>
            <Field label="Residential Address" className="sm:col-span-2">
              <Input {...register("address")} />
            </Field>
            <Field label="Emergency Contact Name">
              <Input {...register("emergencyContactName")} />
            </Field>
            <Field label="Emergency Contact Phone" error={errors.emergencyContactPhone?.message}>
              <Input {...register("emergencyContactPhone")} />
            </Field>
            <Field label="Referral Source">
              <Input {...register("referralSource")} placeholder="Instagram, friend, walk-in..." />
            </Field>
            <Field label="Preferred Communication">
              <Controller
                control={control}
                name="preferredCommunication"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {preferredCommunicationOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div>
            <Label className="mb-2 block">Customer Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={
                    selectedTags.includes(tag.id) ? "opacity-100" : "opacity-40 grayscale hover:opacity-70"
                  }
                >
                  <CustomerTagBadge name={tag.name} color={tag.color} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Mark as VIP</p>
              <p className="text-xs text-muted-foreground">VIP customers are highlighted across the CRM.</p>
            </div>
            <Controller
              control={control}
              name="isVip"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <Field label="Special Notes">
            <Textarea rows={3} {...register("specialNotes")} placeholder="Anything else worth remembering..." />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : mode === "create" ? "Save Customer" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
