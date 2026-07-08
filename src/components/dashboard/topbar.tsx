"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, LogOut } from "lucide-react";
import { initials } from "@/lib/utils";

type SearchResult = { type: string; id: string; label: string; href: string };

export function Topbar({ userName }: { userName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      const clearState = window.setTimeout(() => {
        setResults([]);
        setOpen(false);
      }, 0);
      return () => window.clearTimeout(clearState);
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setResults([]);
          setOpen(false);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div ref={boxRef} className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search customers, orders, invoices..."
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            {results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(r.href);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted-surface"
              >
                <span className="text-foreground">{r.label}</span>
                <span className="text-xs uppercase text-muted">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
          {initials(userName)}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
