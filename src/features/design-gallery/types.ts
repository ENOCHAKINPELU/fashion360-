export interface DesignCategoryOption {
  id: string;
  name: string;
  icon: string | null;
  isSystem: boolean;
  _count?: { designs: number };
}

export interface DesignTagOption {
  id: string;
  name: string;
  color: string | null;
  isSystem: boolean;
}

export interface DesignCollectionOption {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  status: string;
  createdAt: string;
  _count?: { designs: number };
}

export interface DesignImageItem {
  id: string;
  url: string;
  mediaType: string;
  sortOrder: number;
}

export interface DesignListItem {
  id: string;
  designCode: string;
  name: string;
  description: string | null;
  mainImageUrl: string | null;
  occasion: string | null;
  estimatedCompletionDays: number | null;
  basePrice: number | null;
  difficulty: string | null;
  status: string;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  category: DesignCategoryOption | null;
  collection: DesignCollectionOption | null;
  tags: DesignTagOption[];
  images: DesignImageItem[];
  _count?: { favorites: number };
}

export interface DesignFilters {
  categoryId?: string;
  collectionId?: string;
  tag?: string;
  status?: string;
  difficulty?: string;
  occasion?: string;
  featured?: string;
  minPrice?: string;
  maxPrice?: string;
}

export interface FabricLibraryItemData {
  id: string;
  name: string;
  imageUrl: string | null;
  colorVariants: string[];
  texture: string | null;
  description: string | null;
  recommendedUses: string[];
  availability: string;
}

export interface ColorLibraryItemData {
  id: string;
  name: string;
  hexValue: string;
  pairsWith: string[];
}

export interface DesignCustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
}
