"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerFormDialog } from "@/components/dashboard/customer-form-dialog";
import { initials } from "@/lib/utils";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  _count: { orders: number; measurements: number };
};

export function CustomersClient({
  customers,
  initialQuery,
  autoOpen,
}: {
  customers: CustomerRow[];
  initialQuery: string;
  autoOpen: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("q", query);
      else params.delete("q");
      params.delete("new");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Customers</h1>
          <p className="text-sm text-muted">Every client relationship, in one place.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New customer
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers..."
          className="pl-9"
        />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start tracking orders, measurements, and appointments."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New customer
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Orders</th>
                <th className="px-6 py-3 font-medium">Measurements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-muted-surface"
                  onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
                        {initials(c.name)}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/customers/${c.id}`}
                          className="font-medium text-foreground hover:text-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.name}
                        </Link>
                        {c.gender && <p className="text-xs capitalize text-muted">{c.gender}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted">
                    <div>{c.phone || "—"}</div>
                    <div className="text-xs">{c.email || ""}</div>
                  </td>
                  <td className="px-6 py-3 text-muted">{c._count.orders}</td>
                  <td className="px-6 py-3 text-muted">{c._count.measurements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CustomerFormDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
