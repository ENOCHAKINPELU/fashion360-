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
import { customerRegisterFormSchema, type CustomerRegisterInput } from "@/lib/validations/auth";

// The consent checkboxes are typed z.literal(true) so the request payload
// always carries an explicit "accepted" (never a bare boolean) — but that
// makes them awkward to bind directly to react-hook-form's typed state
// (unchecked would have to be `false`, which violates the literal type).
// Kept as local state instead, same as the Phase 8 approval-confirmation
// checkboxes, and only merged into the typed payload at submit time.
type FormFields = Omit<CustomerRegisterInput, "acceptTerms" | "acceptPrivacy">;

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [consentError, setConsentError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormFields>({
    resolver: zodResolver(customerRegisterFormSchema),
  });

  async function onSubmit(fields: FormFields) {
    if (!acceptTerms || !acceptPrivacy) {
      setConsentError("You must accept the Terms of Service and Privacy Policy");
      return;
    }
    setConsentError("");
    const data: CustomerRegisterInput = { ...fields, acceptTerms: true, acceptPrivacy: true };

    setLoading(true);
    const res = await fetch("/api/register/customer", {
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

    toast.success("Welcome to Fashion360! Your digital fashion journey starts here.");
    router.push("/onboarding/customer");
    router.refresh();
  }

  return (
    <Card className="border-none shadow-lg [--card-spacing:--spacing(7)]">
      <CardHeader className="items-start">
        <CardTitle className="text-xl">Join Fashion360</CardTitle>
        <CardDescription>Create your Fashion Passport and start your style journey.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" placeholder="Enoch Adeyemi" {...register("fullName")} />
            {errors.fullName && <p className="text-xs text-danger">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" {...register("phone")} />
            {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-danger">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">At least 8 characters, with an uppercase letter and a number.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
          </div>

          <div className="space-y-2.5 pt-1">
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

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
              />
              <span>
                I accept the{" "}
                <Link href="/privacy" className="font-medium text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {consentError && <p className="text-xs text-danger">{consentError}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create my Fashion360 account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Are you a fashion business?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Start your business
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
