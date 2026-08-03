export interface CustomerTagItem {
  id: string;
  name: string;
  color: string | null;
}

export interface CustomerListItem {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  gender: string | null;
  status: string;
  isVip: boolean;
  isArchived: boolean;
  profilePhotoUrl: string | null;
  createdAt: string;
  tags: CustomerTagItem[];
}
