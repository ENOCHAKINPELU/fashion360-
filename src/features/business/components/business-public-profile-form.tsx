"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { businessProfileSchema, businessProfileVisibilityOptions, type BusinessProfileInput } from "@/lib/validations/business-profile";

export function BusinessPublicProfileForm({ defaultValues }: { defaultValues: BusinessProfileInput }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues,
  });

  async function onSubmit(data: BusinessProfileInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save your profile");
      toast.success("Public profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Username / Handle</Label>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">fashion360.app/business/</span>
          <Input {...register("username")} placeholder="ada-couture" className="max-w-xs" />
        </div>
        {errors.username && <p className="text-xs text-danger">{errors.username.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea rows={4} {...register("description")} placeholder="Tell customers what makes your business unique..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Service Area</Label>
          <Input {...register("serviceArea")} placeholder="e.g. Lagos & Ogun State" />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input {...register("website")} placeholder="https://..." />
          {errors.website && <p className="text-xs text-danger">{errors.website.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Business Registration Number</Label>
          <Input {...register("registrationNumber")} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label>Years of Experience</Label>
          <Input type="number" min={0} max={100} {...register("yearsOfExperience")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Profile Visibility</Label>
        <div className="space-y-2">
          {businessProfileVisibilityOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                className="mt-1"
                checked={watch("visibility") === opt.value}
                onChange={() => setValue("visibility", opt.value as BusinessProfileInput["visibility"])}
              />
              <span>
                <span className="block font-medium text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Public Profile"}
      </Button>
    </form>
  );
}
