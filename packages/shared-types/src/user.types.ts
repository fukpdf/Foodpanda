import type { ID, Address, AuditFields, Media } from "./common.types.js";
import type { UserRole } from "./auth.types.js";

export type UserStatus = "active" | "suspended" | "pending_verification" | "deleted";

export type User = AuditFields & {
  id: ID;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  defaultAddressId?: ID;
  preferredLocale?: string;
  preferredCurrency?: string;
  metadata?: Record<string, unknown>;
};

export type CustomerProfile = {
  userId: ID;
  savedAddresses: Address[];
  orderCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  dietaryPreferences?: string[];
  allergyInfo?: string[];
};

export type RiderProfile = {
  userId: ID;
  licenseNumber: string;
  vehicleType: "bicycle" | "motorcycle" | "car" | "van";
  vehiclePlate: string;
  isOnline: boolean;
  currentLocation?: { lat: number; lng: number };
  rating: number;
  totalDeliveries: number;
  verifiedAt?: string;
  documents: Media[];
};

export type UpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  preferredLocale?: string;
  preferredCurrency?: string;
};
