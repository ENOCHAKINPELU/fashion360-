"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function VerifyEmailContent() {
  const token = useSearchParams().get("token") || "";
  const [status, setStatus] = useState<"pending" | "success" | "error">(() => (token ? "pending" : "error"));

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then((res) => setStatus(res.ok ? "success" : "error"))
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setStatus("error");
      });

    return () => controller.abort();
  }, [token]);

  return (
    <Card>
      <CardHeader className="flex-col items-start pb-4">
        <CardTitle>Email verification</CardTitle>
        <CardDescription>Confirming your Fashion360 account.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 text-sm">
        {status === "pending" && <p className="text-muted">Verifying...</p>}
        {status === "success" && <p className="text-success">Your email is verified. You can sign in now.</p>}
        {status === "error" && <p className="text-danger">This verification link is invalid or has expired.</p>}
        <Link href="/sign-in" className="mt-4 inline-block font-medium text-accent">
          Go to sign in
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
