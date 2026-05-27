import { and, eq, ilike, isNull } from "drizzle-orm";
import type { Database } from "../client/index.js";
import {
  NewVendor,
  NewVendorBranch,
  Vendor,
  VendorBranch,
  vendorBranches,
  vendors,
} from "../schemas/index.js";
import { buildGeohashPrefixFilter } from "../utils/index.js";
import { BaseRepository } from "./base.repository.js";

export class VendorRepository extends BaseRepository<
  typeof vendors,
  Vendor,
  NewVendor
> {
  constructor(db: Database) {
    super(db, vendors);
  }

  async findBySlug(slug: string): Promise<Vendor | null> {
    const result = await this.db
      .select()
      .from(vendors)
      .where(and(eq(vendors.slug, slug), isNull(vendors.deletedAt)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByOwnerId(ownerUserId: string): Promise<Vendor | null> {
    const result = await this.db
      .select()
      .from(vendors)
      .where(and(eq(vendors.ownerUserId, ownerUserId), isNull(vendors.deletedAt)))
      .limit(1);
    return result[0] ?? null;
  }

  async findWithBranches(
    vendorId: string,
  ): Promise<(Vendor & { branches: VendorBranch[] }) | null> {
    const result = await this.db.query.vendors.findFirst({
      where: and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)),
      with: { branches: { where: isNull(vendorBranches.deletedAt) } },
    });
    return result ?? null;
  }

  async findPendingApproval(): Promise<Vendor[]> {
    return this.db
      .select()
      .from(vendors)
      .where(
        and(
          eq(vendors.status, "pending_approval"),
          isNull(vendors.deletedAt),
        ),
      );
  }

  async searchByName(query: string, limit = 20): Promise<Vendor[]> {
    return this.db
      .select()
      .from(vendors)
      .where(
        and(
          ilike(vendors.name, `%${query}%`),
          eq(vendors.status, "active"),
          eq(vendors.isActive, true),
          isNull(vendors.deletedAt),
        ),
      )
      .limit(limit);
  }

  async approve(vendorId: string, approvedById: string): Promise<Vendor | null> {
    return this.update(vendorId, {
      status: "active",
      isActive: true,
      approvedAt: new Date(),
      approvedById,
    });
  }

  async reject(
    vendorId: string,
    rejectedById: string,
    reason: string,
  ): Promise<Vendor | null> {
    return this.update(vendorId, {
      status: "rejected",
      isActive: false,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
  }
}

export class VendorBranchRepository extends BaseRepository<
  typeof vendorBranches,
  VendorBranch,
  NewVendorBranch
> {
  constructor(db: Database) {
    super(db, vendorBranches);
  }

  async findByVendorId(vendorId: string): Promise<VendorBranch[]> {
    return this.db
      .select()
      .from(vendorBranches)
      .where(
        and(
          eq(vendorBranches.vendorId, vendorId),
          isNull(vendorBranches.deletedAt),
        ),
      );
  }

  async findMainBranch(vendorId: string): Promise<VendorBranch | null> {
    const result = await this.db
      .select()
      .from(vendorBranches)
      .where(
        and(
          eq(vendorBranches.vendorId, vendorId),
          eq(vendorBranches.isMainBranch, true),
          isNull(vendorBranches.deletedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findNearbyActive(geohashPrefix: string): Promise<VendorBranch[]> {
    return this.db
      .select()
      .from(vendorBranches)
      .where(
        and(
          buildGeohashPrefixFilter(vendorBranches.geohash as any, geohashPrefix),
          eq(vendorBranches.status, "active"),
          isNull(vendorBranches.deletedAt),
        ),
      );
  }

  async pause(branchId: string, reason: string): Promise<VendorBranch | null> {
    return this.update(branchId, { isPaused: true, pauseReason: reason });
  }

  async unpause(branchId: string): Promise<VendorBranch | null> {
    return this.update(branchId, { isPaused: false, pauseReason: null });
  }
}
