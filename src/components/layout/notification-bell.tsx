"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime, cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-danger" aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="You're all caught up" className="border-none py-10" />
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "border-b border-border px-4 py-3 last:border-none",
                  !n.readAt && "bg-accent-soft/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  {!n.readAt && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">{formatRelativeTime(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
