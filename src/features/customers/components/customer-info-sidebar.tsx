"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Phone,
  Mail,
  MapPin,
  Cake,
  Briefcase,
  Users2,
  MessageCircleHeart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/shared/components/user-avatar";
import { CustomerTagBadge } from "@/features/customers/components/customer-tag-badge";
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog";
import { formatDate } from "@/lib/utils";
import type { CustomerFormInput } from "@/lib/validations/customer";

interface CustomerDetail {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  occupation: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  referralSource: string | null;
  specialNotes: string | null;
  status: string;
  isVip: boolean;
  profilePhotoUrl: string | null;
  tags: { id: string; name: string; color: string | null }[];
}

export function CustomerInfoSidebar({ customer }: { customer: CustomerDetail }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const location = [customer.city, customer.state, customer.country].filter(Boolean).join(", ");

  return (
    <Card className="h-fit border-none shadow-sm">
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <UserAvatar name={fullName} image={customer.profilePhotoUrl} className="size-20 text-lg" />
          <div className="mt-3 flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-foreground">{fullName}</h2>
            {customer.isVip && <Badge className="bg-primary text-white hover:bg-primary">VIP</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{customer.customerCode}</p>
          <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" /> Edit Profile
          </Button>
        </div>

        <div className="space-y-3 border-t border-border pt-4 text-sm">
          <InfoRow icon={Phone} label={customer.phone ?? "N/A"} />
          {customer.whatsapp && <InfoRow icon={MessageCircleHeart} label={`${customer.whatsapp} (WhatsApp)`} />}
          <InfoRow icon={Mail} label={customer.email ?? "N/A"} />
          <InfoRow icon={MapPin} label={location || customer.address || "N/A"} />
          <InfoRow icon={Cake} label={customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "N/A"} />
          <InfoRow icon={Briefcase} label={customer.occupation ?? "N/A"} />
          <InfoRow icon={Users2} label={customer.referralSource ? `Referred via ${customer.referralSource}` : "N/A"} />
        </div>

        {customer.tags.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <CustomerTagBadge key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          </div>
        )}

        {customer.specialNotes && (
          <div className="border-t border-border pt-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Notes</p>
            <p className="text-sm text-foreground">{customer.specialNotes}</p>
          </div>
        )}
      </CardContent>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        customerId={customer.id}
        defaultValues={{
          profilePhotoUrl: customer.profilePhotoUrl ?? "",
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          whatsapp: customer.whatsapp ?? "",
          gender: customer.gender as CustomerFormInput["gender"],
          dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : "",
          occupation: customer.occupation ?? "",
          country: customer.country ?? "",
          state: customer.state ?? "",
          city: customer.city ?? "",
          address: customer.address ?? "",
          referralSource: customer.referralSource ?? "",
          specialNotes: customer.specialNotes ?? "",
          status: customer.status as CustomerFormInput["status"],
          isVip: customer.isVip,
        }}
        defaultTagIds={customer.tags.map((t) => t.id)}
        onSaved={() => router.refresh()}
      />
    </Card>
  );
}

function InfoRow({ icon: Icon, label }: { icon: typeof Phone; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
  );
}
