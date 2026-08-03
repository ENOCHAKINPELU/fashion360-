"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  CalendarPlus,
  ShoppingBag,
  Ruler,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/shared/components/user-avatar";
import { CustomerTagBadge } from "@/features/customers/components/customer-tag-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";
import { Users } from "lucide-react";
import type { CustomerListItem } from "@/features/customers/types";

const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  LEAD: "outline",
  PROSPECT: "secondary",
  ACTIVE: "default",
  INACTIVE: "outline",
  BLOCKED: "destructive",
};

export function CustomersTable({
  customers,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onArchiveToggle,
  onDeleteRequest,
}: {
  customers: CustomerListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (customer: CustomerListItem) => void;
  onArchiveToggle: (customer: CustomerListItem) => void;
  onDeleteRequest: (customer: CustomerListItem) => void;
}) {
  const router = useRouter();

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No customers found"
        description="Try adjusting your search or filters, or add your first customer."
      />
    );
  }

  const allSelected = customers.every((c) => selectedIds.has(c.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} aria-label="Select all" />
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Last Appointment</TableHead>
            <TableHead>Last Order</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(customer.id)}
                  onCheckedChange={() => onToggleSelect(customer.id)}
                  aria-label={`Select ${customer.firstName}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={`${customer.firstName} ${customer.lastName}`}
                    image={customer.profilePhotoUrl}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium text-foreground">
                        {customer.firstName} {customer.lastName}
                      </p>
                      {customer.isVip && (
                        <Badge className="bg-primary text-white hover:bg-primary">VIP</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{customer.customerCode}</p>
                    {customer.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {customer.tags.slice(0, 2).map((tag) => (
                          <CustomerTagBadge key={tag.id} name={tag.name} color={tag.color} />
                        ))}
                        {customer.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{customer.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.phone ?? "N/A"}</TableCell>
              <TableCell className="text-muted-foreground">{customer.email ?? "N/A"}</TableCell>
              <TableCell className="text-muted-foreground capitalize">
                {customer.gender ? customer.gender.toLowerCase().replace(/_/g, " ") : "N/A"}
              </TableCell>
              <TableCell className="text-muted-foreground">N/A</TableCell>
              <TableCell className="text-muted-foreground">N/A</TableCell>
              <TableCell className="text-muted-foreground">N/A</TableCell>
              <TableCell className="text-muted-foreground">N/A</TableCell>
              <TableCell>
                <Badge variant={STATUS_TONE[customer.status] ?? "outline"} className="capitalize">
                  {customer.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/customers/${customer.id}`}>
                        <Eye /> View Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(customer)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/appointments?customerId=${customer.id}`}>
                        <CalendarPlus /> Create Appointment
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/orders/new?customerId=${customer.id}`}>
                        <ShoppingBag /> Create Order
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/measurements?customerId=${customer.id}`}>
                        <Ruler /> Create Measurement
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onArchiveToggle(customer)}>
                      {customer.isArchived ? (
                        <>
                          <ArchiveRestore /> Unarchive
                        </>
                      ) : (
                        <>
                          <Archive /> Archive
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onDeleteRequest(customer)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
