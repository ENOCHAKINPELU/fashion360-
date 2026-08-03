"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/shared/components/image-upload";
import {
  businessRegistrationSchema,
  type BusinessRegistrationInput,
  businessTypeOptions,
  measurementUnitOptions,
  currencyOptions,
  timezoneOptions,
} from "@/lib/validations/business";

interface BusinessDetailsFormProps {
  mode: "create" | "update";
  defaultValues?: Partial<BusinessRegistrationInput>;
}

export function BusinessDetailsForm({ mode, defaultValues }: BusinessDetailsFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessRegistrationInput>({
    resolver: zodResolver(businessRegistrationSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      email: "",
      phone: "",
      country: "Nigeria",
      state: "",
      city: "",
      address: "",
      businessType: "INDEPENDENT_DESIGNER",
      currency: "NGN",
      timezone: "Africa/Lagos",
      measurementUnit: "METRIC",
      ...defaultValues,
    },
  });

  async function onSubmit(data: BusinessRegistrationInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/business", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");

      if (mode === "create") {
        toast.success("Business created, welcome to Fashion360!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.success("Business profile updated");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label className="mb-2 block">Business Logo</Label>
        <ImageUpload
          value={watch("logoUrl")}
          onChange={(url) => setValue("logoUrl", url, { shouldDirty: true })}
          folder="logos"
          label="Upload logo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business Name" error={errors.name?.message}>
          <Input {...register("name")} placeholder="Ada Couture" />
        </Field>
        <Field label="Business Type" error={errors.businessType?.message}>
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Business Email" error={errors.email?.message}>
          <Input {...register("email")} type="email" placeholder="hello@adacouture.com" />
        </Field>
        <Field label="Business Phone" error={errors.phone?.message}>
          <Input {...register("phone")} placeholder="+234 800 000 0000" />
        </Field>
        <Field label="Country" error={errors.country?.message}>
          <Input {...register("country")} placeholder="Nigeria" />
        </Field>
        <Field label="State" error={errors.state?.message}>
          <Input {...register("state")} placeholder="Lagos" />
        </Field>
        <Field label="City" error={errors.city?.message}>
          <Input {...register("city")} placeholder="Ikeja" />
        </Field>
        <Field label="Business Address" error={errors.address?.message}>
          <Input {...register("address")} placeholder="12 Allen Avenue" />
        </Field>
        <Field label="Currency" error={errors.currency?.message}>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Timezone" error={errors.timezone?.message}>
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Measurement Unit" error={errors.measurementUnit?.message}>
          <Controller
            control={control}
            name="measurementUnit"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {measurementUnitOptions.map((opt) => (
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

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Saving..." : mode === "create" ? "Create business" : "Save changes"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
