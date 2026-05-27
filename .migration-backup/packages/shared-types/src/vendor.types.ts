import type { ID, Address, AuditFields, GeoCoordinate, Media, Money } from "./common.types.js";

export type VendorStatus = "active" | "inactive" | "suspended" | "pending_approval" | "closed";
export type VendorCategory =
  | "restaurant"
  | "cafe"
  | "bakery"
  | "grocery"
  | "pharmacy"
  | "convenience"
  | "specialty";

export type OperatingHours = {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type DeliveryZone = {
  id: ID;
  vendorId: ID;
  radiusKm: number;
  polygonCoordinates?: GeoCoordinate[];
  minimumOrderAmount: Money;
  deliveryFee: Money;
  estimatedMinutes: number;
};

export type Vendor = AuditFields & {
  id: ID;
  ownerId: ID;
  slug: string;
  name: string;
  description?: string;
  category: VendorCategory;
  tags?: string[];
  status: VendorStatus;
  coverImage?: Media;
  logo?: Media;
  address: Address;
  phone: string;
  email: string;
  website?: string;
  rating: number;
  reviewCount: number;
  operatingHours: OperatingHours[];
  deliveryZones: DeliveryZone[];
  acceptedPaymentMethods: string[];
  averagePreparationMinutes: number;
  minimumOrderAmount?: Money;
  isOpen: boolean;
  isFeatured: boolean;
  metadata?: Record<string, unknown>;
};

export type MenuItem = AuditFields & {
  id: ID;
  vendorId: ID;
  categoryId: ID;
  name: string;
  description?: string;
  images: Media[];
  basePrice: Money;
  isAvailable: boolean;
  isPopular: boolean;
  preparationMinutes?: number;
  calories?: number;
  allergens?: string[];
  dietaryFlags?: ("vegan" | "vegetarian" | "halal" | "gluten-free" | "dairy-free")[];
  modifierGroups?: MenuModifierGroup[];
  sortOrder: number;
};

export type MenuCategory = AuditFields & {
  id: ID;
  vendorId: ID;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

export type MenuModifierGroup = {
  id: ID;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: MenuModifierOption[];
};

export type MenuModifierOption = {
  id: ID;
  name: string;
  additionalPrice: Money;
  isDefault: boolean;
  isAvailable: boolean;
};
