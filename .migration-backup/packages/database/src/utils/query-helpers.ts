import { SQL, and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function paginate(params: PaginationParams) {
  const page = Math.max(1, params.page);
  const limit = Math.min(100, Math.max(1, params.limit));
  const offset = (page - 1) * limit;
  return { limit, offset, page };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function notDeleted(table: { deletedAt: PgColumn }) {
  return isNull(table.deletedAt);
}

export function isActive(table: { isActive: PgColumn }) {
  return eq(table.isActive, true);
}

export function withinRadius(
  latCol: PgColumn,
  lonCol: PgColumn,
  lat: number,
  lon: number,
  radiusKm: number,
): SQL {
  return sql`(
    6371 * acos(
      cos(radians(${lat})) * cos(radians(${latCol})) *
      cos(radians(${lonCol}) - radians(${lon})) +
      sin(radians(${lat})) * sin(radians(${latCol}))
    )
  ) <= ${radiusKm}`;
}

export function buildOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function softDeleteFilter(includeDeleted = false): SQL | undefined {
  if (includeDeleted) return undefined;
  return sql`deleted_at IS NULL`;
}

export function activeSessionFilter(): SQL {
  return and(
    eq(sql`status`, "active"),
    gt(sql`expires_at`, sql`NOW()`),
  ) as SQL;
}

export function expiredTokenFilter(): SQL {
  return lt(sql`expires_at`, sql`NOW()`);
}

export function buildGeohashPrefixFilter(
  geohashCol: PgColumn,
  prefix: string,
): SQL {
  return sql`${geohashCol} LIKE ${prefix + "%"}`;
}

export function countQuery(table: PgTable): SQL {
  return sql`SELECT count(*) FROM ${table}`;
}
