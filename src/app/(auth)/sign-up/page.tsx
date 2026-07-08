"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: form.get("businessName"),
        ownerName: form.get("ownerName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create your account");
      return;
    }

    toast.success("Account created — check your email to verify it.");
    router.push("/sign-in");
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start pb-4">
        <CardTitle>Start your business on Fashion360</CardTitle>
        <CardDescription>Set up your fashion house in under a minute.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" name="businessName" required placeholder="Ada Couture" />
          </div>
          <div>
            <Label htmlFor="ownerName">Your name</Label>
            <Input id="ownerName" name="ownerName" required placeholder="Ada Okafor" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-accent">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
