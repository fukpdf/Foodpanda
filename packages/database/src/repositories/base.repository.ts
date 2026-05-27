import { SQL, and, count, eq, isNull } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Database } from "../client/index.js";
import { buildPaginatedResult, paginate } from "../utils/index.js";
import type { PaginatedResult, PaginationParams } from "../utils/index.js";

export interface FindManyOptions {
  pagination?: PaginationParams;
  includeDeleted?: boolean;
  where?: SQL;
  orderBy?: SQL;
}

export abstract class BaseRepository<
  TTable extends PgTable,
  TSelect extends Record<string, unknown> = Record<string, unknown>,
  TInsert extends Record<string, unknown> = Record<string, unknown>,
> {
  protected constructor(
    protected readonly db: Database,
    protected readonly table: TTable,
  ) {}

  async findById(id: string): Promise<TSelect | null> {
    const tbl = this.table as any;
    const result = await this.db
      .select()
      .from(tbl)
      .where(eq(tbl.id, id))
      .limit(1);
    return (result[0] as TSelect) ?? null;
  }

  async findMany(options: FindManyOptions = {}): Promise<PaginatedResult<TSelect>> {
    const { pagination = { page: 1, limit: 20 }, where, includeDeleted } = options;
    const { limit, offset, page } = paginate(pagination);
    const tbl = this.table as any;

    const conditions: SQL[] = [];
    if (where) conditions.push(where);
    if (!includeDeleted && tbl.deletedAt !== undefined) {
      conditions.push(isNull(tbl.deletedAt));
    }

    const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      this.db.select().from(tbl).where(baseWhere).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(tbl).where(baseWhere),
    ]);

    return buildPaginatedResult(
      rows as TSelect[],
      Number(countResult[0]?.count ?? 0),
      page,
      limit,
    );
  }

  async create(data: TInsert): Promise<TSelect> {
    const tbl = this.table as any;
    const result = await this.db.insert(tbl).values(data).returning();
    return result[0] as TSelect;
  }

  async createMany(data: TInsert[]): Promise<TSelect[]> {
    if (data.length === 0) return [];
    const tbl = this.table as any;
    const result = await this.db.insert(tbl).values(data).returning();
    return result as TSelect[];
  }

  async update(id: string, data: Partial<TInsert>): Promise<TSelect | null> {
    const tbl = this.table as any;
    const result = await this.db
      .update(tbl)
      .set(data)
      .where(eq(tbl.id, id))
      .returning();
    return (result[0] as TSelect) ?? null;
  }

  async hardDelete(id: string): Promise<boolean> {
    const tbl = this.table as any;
    const result = await this.db
      .delete(tbl)
      .where(eq(tbl.id, id))
      .returning();
    return result.length > 0;
  }

  async softDelete(id: string): Promise<TSelect | null> {
    const tbl = this.table as any;
    if (!tbl.deletedAt) {
      throw new Error(`Table does not support soft deletes`);
    }
    return this.update(id, { deletedAt: new Date() } as unknown as Partial<TInsert>);
  }

  async restore(id: string): Promise<TSelect | null> {
    const tbl = this.table as any;
    if (!tbl.deletedAt) {
      throw new Error(`Table does not support soft deletes`);
    }
    return this.update(id, { deletedAt: null } as unknown as Partial<TInsert>);
  }

  async exists(id: string): Promise<boolean> {
    const tbl = this.table as any;
    const result = await this.db
      .select({ count: count() })
      .from(tbl)
      .where(eq(tbl.id, id));
    return Number(result[0]?.count ?? 0) > 0;
  }

  async countWhere(where?: SQL): Promise<number> {
    const tbl = this.table as any;
    const result = await this.db
      .select({ count: count() })
      .from(tbl)
      .where(where);
    return Number(result[0]?.count ?? 0);
  }
}
