"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/shared/components/image-upload";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: ProfileInput;
  email: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues });

  async function onSubmit(data: ProfileInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label className="mb-2 block">Profile Photo</Label>
        <Controller
          control={control}
          name="image"
          render={() => (
            <ImageUpload
              value={watch("image")}
              onChange={(url) => setValue("image", url, { shouldDirty: true })}
              folder="avatars"
              shape="circle"
              label="Upload photo"
            />
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>First name</Label>
          <Input {...register("firstName")} />
          {errors.firstName && <p className="text-xs text-danger">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Last name</Label>
          <Input {...register("lastName")} />
          {errors.lastName && <p className="text-xs text-danger">{errors.lastName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input {...register("phone")} placeholder="+234 800 000 0000" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Position</Label>
          <Input {...register("position")} placeholder="Creative Director" />
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
