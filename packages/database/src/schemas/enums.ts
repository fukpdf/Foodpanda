import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "vendor",
  "rider",
  "admin",
  "superadmin",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "pending_verification",
  "active",
  "suspended",
  "banned",
  "deactivated",
  "deleted",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "email_verified",
  "phone_verified",
  "fully_verified",
]);

export const authProviderEnum = pgEnum("auth_provider", [
  "email_password",
  "google",
  "facebook",
  "apple",
  "phone_otp",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "expired",
  "revoked",
  "logged_out",
]);

export const vendorStatusEnum = pgEnum("vendor_status", [
  "pending_approval",
  "active",
  "suspended",
  "rejected",
  "closed",
]);

export const branchStatusEnum = pgEnum("branch_status", [
  "active",
  "inactive",
  "temporarily_closed",
  "permanently_closed",
]);

export const riderStatusEnum = pgEnum("rider_status", [
  "pending_verification",
  "active",
  "suspended",
  "offline",
  "deactivated",
]);

export const riderAvailabilityEnum = pgEnum("rider_availability", [
  "online",
  "offline",
  "on_delivery",
  "on_break",
]);

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "bicycle",
  "motorcycle",
  "car",
  "van",
  "electric_scooter",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending",
  "confirmed",
  "accepted_by_vendor",
  "preparing",
  "ready_for_pickup",
  "assigned_to_rider",
  "picked_up",
  "in_transit",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
]);

export const dispatchStatusEnum = pgEnum("dispatch_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "completed",
  "expired",
]);

export const cancellationActorEnum = pgEnum("cancellation_actor", [
  "customer",
  "vendor",
  "rider",
  "system",
  "admin",
]);

export const addressLabelEnum = pgEnum("address_label", [
  "home",
  "work",
  "partner",
  "other",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "restore",
  "login",
  "logout",
  "approve",
  "reject",
  "suspend",
  "ban",
  "password_change",
  "role_change",
  "permission_change",
]);
