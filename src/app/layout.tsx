import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fashion360 — Fashion Business Management Platform",
  description:
    "The all-in-one platform for fashion designers, tailors, and bespoke fashion houses to manage customers, orders, measurements, and payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased font-sans", inter.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
