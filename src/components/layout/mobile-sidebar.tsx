"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/shared/components/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 border-none bg-sidebar p-0 text-white [&_svg]:text-white">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
          <Link href="/dashboard" className="text-white" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
