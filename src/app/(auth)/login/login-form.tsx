"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

function LoginFormInner({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const explicitCallbackUrl = params.get("callbackUrl");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      remember: String(data.remember),
      redirect: false,
    });
    if (result?.error) {
      setLoading(false);
      toast.error("Invalid email or password");
      return;
    }

    // No explicit destination (e.g. the middleware didn't bounce them off a
    // protected page) — route by role instead of always defaulting to the
    // business dashboard, since customers now have their own area.
    let destination = explicitCallbackUrl;
    if (!destination) {
      const session = await getSession();
      destination = session?.user?.role === "CUSTOMER" ? "/account" : "/dashboard";
    }

    setLoading(false);
    router.push(destination);
    router.refresh();
  }

  return (
    <Card className="border-none shadow-lg [--card-spacing:--spacing(7)]">
      <CardHeader className="items-start">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to manage your fashion business.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={watch("remember")} onCheckedChange={(v) => setValue("remember", v === true)} />
            Remember me
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {googleEnabled && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              OR
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: explicitCallbackUrl || "/dashboard" })}>
              Continue with Google
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Start free
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

// Wrapped in its own Suspense boundary — useSearchParams() requires one, and
// this keeps the boundary next to the hook that needs it rather than at the
// page level.
export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <Suspense>
      <LoginFormInner googleEnabled={googleEnabled} />
    </Suspense>
  );
}
