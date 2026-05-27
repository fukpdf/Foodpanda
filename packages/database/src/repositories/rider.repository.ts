import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../client/index.js";
import { NewRider, Rider, riders } from "../schemas/index.js";
import { buildGeohashPrefixFilter } from "../utils/index.js";
import { BaseRepository } from "./base.repository.js";

export class RiderRepository extends BaseRepository<
  typeof riders,
  Rider,
  NewRider
> {
  constructor(db: Database) {
    super(db, riders);
  }

  async findByUserId(userId: string): Promise<Rider | null> {
    const result = await this.db
      .select()
      .from(riders)
      .where(and(eq(riders.userId, userId), isNull(riders.deletedAt)))
      .limit(1);
    return result[0] ?? null;
  }

  async findOnlineNearby(geohashPrefix: string): Promise<Rider[]> {
    return this.db
      .select()
      .from(riders)
      .where(
        and(
          buildGeohashPrefixFilter(riders.currentGeohash as any, geohashPrefix),
          eq(riders.availability, "online"),
          eq(riders.status, "active"),
          isNull(riders.deletedAt),
        ),
      );
  }

  async findPendingVerification(): Promise<Rider[]> {
    return this.db
      .select()
      .from(riders)
      .where(
        and(
          eq(riders.status, "pending_verification"),
          isNull(riders.deletedAt),
        ),
      );
  }

  async updateLocation(
    riderId: string,
    lat: number,
    lon: number,
    geohash: string,
  ): Promise<void> {
    await this.db
      .update(riders)
      .set({
        currentLatitude: lat,
        currentLongitude: lon,
        currentGeohash: geohash,
        locationUpdatedAt: new Date(),
      })
      .where(eq(riders.id, riderId));
  }

  async setAvailability(
    riderId: string,
    availability: Rider["availability"],
  ): Promise<Rider | null> {
    const updates: Partial<Rider> = { availability };
    if (availability === "online") {
      updates.lastOnlineAt = new Date();
    }
    return this.update(riderId, updates);
  }

  async verify(riderId: string, verifiedById: string): Promise<Rider | null> {
    return this.update(riderId, {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById,
      status: "active",
    });
  }
}
