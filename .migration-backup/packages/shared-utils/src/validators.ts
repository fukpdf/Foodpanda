import { REGEX, PAGINATION_DEFAULTS, SUPPORTED_CURRENCIES } from "./constants.js";
import type { PaginationParams } from "@deliveryos/shared-types";

export function isValidEmail(email: string): boolean {
  return REGEX.EMAIL.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return REGEX.PHONE.test(phone.trim());
}

export function isValidSlug(slug: string): boolean {
  return REGEX.SLUG.test(slug);
}

export function isValidUUID(id: string): boolean {
  return REGEX.UUID.test(id);
}

export function isValidCurrency(currency: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency);
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Must be at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Must contain a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Must contain a number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    errors.push("Must contain a special character");
  return { valid: errors.length === 0, errors };
}

export function sanitizePagination(params: PaginationParams): Required<PaginationParams> {
  const page = Math.max(1, Number(params.page) || PAGINATION_DEFAULTS.PAGE);
  const limit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, Number(params.limit) || PAGINATION_DEFAULTS.LIMIT)
  );
  return {
    page,
    limit,
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder === "asc" ? "asc" : "desc",
  };
}

export function isValidOrderStatusTransition(from: string, to: string): boolean {
  const { ORDER_STATUS_TRANSITIONS } = require("./constants.js") as typeof import("./constants.js");
  const allowed = ORDER_STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function sanitizeString(input: string, maxLength = 1000): string {
  return input.trim().slice(0, maxLength);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && value > 0;
}
