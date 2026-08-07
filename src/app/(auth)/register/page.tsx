"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

type FormFields = Omit<RegisterInput, "acceptTerms">;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [consentError, setConsentError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormFields>({ resolver: zodResolver(registerSchema.omit({ acceptTerms: true })) });

  async function onSubmit(fields: FormFields) {
    if (!acceptTerms) {
      setConsentError("You must accept the Terms of Service");
      return;
    }
    setConsentError("");
    const data: RegisterInput = { ...fields, acceptTerms: true };

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create your account");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      remember: "true",
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      toast.success("Account created, please sign in.");
      router.push("/login");
      return;
    }

    toast.success("Welcome to Fashion360! Let's set up your business.");
    router.push("/onboarding/business");
    router.refresh();
  }

  return (
    <Card className="border-none shadow-lg [--card-spacing:--spacing(7)]">
      <CardHeader className="items-start">
        <CardTitle className="text-xl">Start your business on Fashion360</CardTitle>
        <CardDescription>Set up your fashion house in under a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" placeholder="Ada" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-danger">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" placeholder="Okafor" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-danger">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-danger">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with an uppercase letter and a number.
              </p>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              I accept the{" "}
              <Link href="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>
            </span>
          </label>
          {consentError && <p className="text-xs text-danger">{consentError}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Are you a customer?{" "}
          <Link href="/register/customer" className="font-medium text-primary hover:underline">
            Join Fashion360
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
