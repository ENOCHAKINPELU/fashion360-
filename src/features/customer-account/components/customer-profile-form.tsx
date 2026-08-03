"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/shared/components/image-upload";
import { customerProfileSchema, type CustomerProfileInput } from "@/lib/validations/customer-account";

const FIT_OPTIONS = [
  { value: "TIGHT", label: "Fitted" },
  { value: "REGULAR", label: "Regular" },
  { value: "LOOSE", label: "Relaxed" },
];

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export function CustomerProfileForm({
  mode,
  defaultValues,
}: {
  mode: "onboarding" | "settings";
  defaultValues?: Partial<CustomerProfileInput>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerProfileInput>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: {
      username: "",
      profilePhotoUrl: "",
      phone: "",
      country: "Nigeria",
      state: "",
      city: "",
      favoriteColors: [],
      favoriteFabrics: [],
      stylePreferences: [],
      fashionInterests: [],
      preferredClothingCategories: [],
      commonOccasions: [],
      ...defaultValues,
    },
  });

  async function onSubmit(data: CustomerProfileInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save your profile");

      toast.success(mode === "onboarding" ? "Your Fashion Passport is updated!" : "Profile updated");
      if (mode === "onboarding") {
        router.push("/account");
      }
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
        <Label>Profile Photo</Label>
        <ImageUpload
          value={watch("profilePhotoUrl") || null}
          onChange={(url) => setValue("profilePhotoUrl", url ?? "")}
          folder="avatars"
          label="Upload photo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="e.g. enoch-a" {...register("username")} />
          {errors.username && <p className="text-xs text-danger">{errors.username.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+234 800 000 0000" {...register("phone")} />
          {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Gender (optional)</Label>
          <Select value={watch("gender") ?? ""} onValueChange={(v) => setValue("gender", v as CustomerProfileInput["gender"])}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Prefer not to say" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of Birth (optional)</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" {...register("country")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Preferred Fit</Label>
        <Select value={watch("preferredFit") ?? ""} onValueChange={(v) => setValue("preferredFit", v as CustomerProfileInput["preferredFit"])}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Select a fit" />
          </SelectTrigger>
          <SelectContent>
            {FIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Favorite Colors</Label>
          <Input
            defaultValue={(defaultValues?.favoriteColors ?? []).join(", ")}
            placeholder="Purple, Gold, Emerald"
            onChange={(e) => setValue("favoriteColors", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Favorite Fabrics</Label>
          <Input
            defaultValue={(defaultValues?.favoriteFabrics ?? []).join(", ")}
            placeholder="Silk, Ankara, Lace"
            onChange={(e) => setValue("favoriteFabrics", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Style Preferences</Label>
          <Input
            defaultValue={(defaultValues?.stylePreferences ?? []).join(", ")}
            placeholder="Minimalist, Bold, Classic"
            onChange={(e) => setValue("stylePreferences", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fashion Interests</Label>
          <Input
            defaultValue={(defaultValues?.fashionInterests ?? []).join(", ")}
            placeholder="Bridal, Corporate wear, Streetwear"
            onChange={(e) => setValue("fashionInterests", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred Clothing Categories</Label>
          <Input
            defaultValue={(defaultValues?.preferredClothingCategories ?? []).join(", ")}
            placeholder="Dresses, Suits, Kaftans"
            onChange={(e) => setValue("preferredClothingCategories", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Common Occasions</Label>
          <Input
            defaultValue={(defaultValues?.commonOccasions ?? []).join(", ")}
            placeholder="Wedding, Church, Office, Parties"
            onChange={(e) => setValue("commonOccasions", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className={mode === "onboarding" ? "w-full" : undefined}>
        {submitting ? "Saving..." : mode === "onboarding" ? "Complete my Fashion Passport" : "Save changes"}
      </Button>
    </form>
  );
}
