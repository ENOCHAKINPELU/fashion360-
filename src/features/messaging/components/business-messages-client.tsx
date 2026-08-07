"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingState } from "@/shared/components/loading-state";
import { UserAvatar } from "@/shared/components/user-avatar";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ConversationListItem {
  id: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  businessUnreadCount: number;
  customerProfile: { id: string; user: { name: string | null; image: string | null } };
}

interface MessageRow {
  id: string;
  senderType: "BUSINESS" | "CUSTOMER";
  body: string;
  createdAt: string;
}

// Two-pane inbox: conversation list on the left (or full-width on mobile
// until one's opened), thread + composer on the right. Polling, not
// websockets — a real V1 tradeoff, not an oversight; see the messaging
// audit finding this closes.
export function BusinessMessagesClient({
  initialConversations,
  preferredId,
}: {
  initialConversations: ConversationListItem[];
  preferredId?: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    (preferredId && initialConversations.some((c) => c.id === preferredId) ? preferredId : initialConversations[0]?.id) ?? null
  );
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  async function refreshList() {
    try {
      const res = await fetch("/api/business/conversations");
      const data = await res.json();
      if (res.ok) setConversations(data.conversations ?? []);
    } catch {
      // Silent — this is a background refresh, the visible list just stays stale until the next tick.
    }
  }

  // No synchronous setState before the first await — safe to call directly
  // from the mount effect below. openConversation (used by click handlers,
  // never from an effect body) additionally resets activeId/messages first.
  async function loadMessages(id: string | null) {
    if (!id) return;
    try {
      const res = await fetch(`/api/business/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load conversation");
      setMessages(data.conversation.messages);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, businessUnreadCount: 0 } : c)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load conversation");
    }
  }

  function openConversation(id: string) {
    setActiveId(id);
    setMessages(null);
    loadMessages(id);
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the open thread and the list every 8s — cheap, no infra dependency,
  // good enough for a V1 inbox that isn't claiming to be real-time chat.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshList();
      if (activeId) {
        fetch(`/api/business/conversations/${activeId}`)
          .then((r) => r.json())
          .then((d) => d.conversation && setMessages(d.conversation.messages))
          .catch(() => {});
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/business/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send message");
      setMessages((prev) => [...(prev ?? []), data.message]);
      setDraft("");
      refreshList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations yet"
        description="Message a customer from their profile to start one, or they'll appear here once a customer messages you."
      />
    );
  }

  return (
    <div className="grid h-[calc(100vh-220px)] min-h-[420px] grid-cols-1 overflow-hidden rounded-2xl border border-border md:grid-cols-[280px_1fr]">
      <div className={cn("overflow-y-auto border-border md:border-r", activeId && "hidden md:block")}>
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => openConversation(c.id)}
            className={cn(
              "flex w-full items-center gap-3 border-b border-border p-3 text-left transition-colors hover:bg-muted",
              activeId === c.id && "bg-accent-soft"
            )}
          >
            <UserAvatar name={c.customerProfile.user.name} image={c.customerProfile.user.image} className="size-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{c.customerProfile.user.name ?? "Customer"}</p>
                {c.lastMessageAt && <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(c.lastMessageAt)}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-muted-foreground">{c.lastMessagePreview ?? "No messages yet"}</p>
                {c.businessUnreadCount > 0 && (
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {c.businessUnreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className={cn("flex flex-col", !activeId && "hidden md:flex")}>
        {active ? (
          <>
            <div className="flex items-center gap-2 border-b border-border p-3">
              <button className="text-xs text-muted-foreground md:hidden" onClick={() => setActiveId(null)}>
                ← Back
              </button>
              <UserAvatar name={active.customerProfile.user.name} image={active.customerProfile.user.image} className="size-7" />
              <p className="text-sm font-medium text-foreground">{active.customerProfile.user.name ?? "Customer"}</p>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages === null ? (
                <LoadingState />
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No messages yet — say hello.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.senderType === "BUSINESS" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                        m.senderType === "BUSINESS" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {m.body}
                      <p className={cn("mt-1 text-[10px]", m.senderType === "BUSINESS" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatRelativeTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-end gap-2 border-t border-border p-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Write a message..."
                rows={1}
                className="max-h-32 min-h-9 flex-1 resize-none"
                disabled={sending}
              />
              <Button size="icon" onClick={send} disabled={sending || !draft.trim()} aria-label="Send message">
                <Send className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a conversation</div>
        )}
      </div>
    </div>
  );
}
