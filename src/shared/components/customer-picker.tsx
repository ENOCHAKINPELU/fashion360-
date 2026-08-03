"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/shared/components/user-avatar";

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
}

interface NewCustomerDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function CustomerPicker({
  customerId,
  onSelectCustomer,
  newCustomer,
  onNewCustomerChange,
}: {
  customerId?: string;
  onSelectCustomer: (customer: CustomerOption | undefined) => void;
  newCustomer?: NewCustomerDraft;
  onNewCustomerChange: (draft: NewCustomerDraft | undefined) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(customerId ? "existing" : "existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [selected, setSelected] = useState<CustomerOption | undefined>();
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (mode !== "existing" || !query.trim()) {
      // Deferred rather than called synchronously in the effect body.
      const clear = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(clear);
    }
    const handle = setTimeout(() => {
      setSearching(true);
      fetch(`/api/customers?search=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.customers ?? []))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, mode]);

  function selectCustomer(customer: CustomerOption) {
    setSelected(customer);
    setResults([]);
    setQuery("");
    onSelectCustomer(customer);
  }

  function clearSelection() {
    setSelected(undefined);
    onSelectCustomer(undefined);
  }

  const draft = newCustomer ?? { firstName: "", lastName: "", email: "", phone: "" };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "existing" ? "default" : "outline"}
          onClick={() => {
            setMode("existing");
            onNewCustomerChange(undefined);
          }}
        >
          Existing Customer
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "new" ? "default" : "outline"}
          onClick={() => {
            setMode("new");
            clearSelection();
            onNewCustomerChange(draft);
          }}
          className="gap-1.5"
        >
          <UserPlus className="size-3.5" /> New Customer
        </Button>
      </div>

      {mode === "existing" ? (
        selected ? (
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <UserAvatar name={`${selected.firstName} ${selected.lastName}`} image={selected.profilePhotoUrl} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {selected.firstName} {selected.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{selected.phone ?? selected.email ?? "N/A"}</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={clearSelection}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
            {(results.length > 0 || searching) && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                {searching && <p className="p-3 text-xs text-muted-foreground">Searching...</p>}
                {results.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <UserAvatar name={`${c.firstName} ${c.lastName}`} image={c.profilePhotoUrl} className="size-7" />
                    <span>
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input
              value={draft.firstName}
              onChange={(e) => onNewCustomerChange({ ...draft, firstName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input value={draft.lastName} onChange={(e) => onNewCustomerChange({ ...draft, lastName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={draft.email} onChange={(e) => onNewCustomerChange({ ...draft, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={draft.phone} onChange={(e) => onNewCustomerChange({ ...draft, phone: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
