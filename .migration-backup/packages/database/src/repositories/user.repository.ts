import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import type { Database } from "../client/index.js";
import { userProfiles, users } from "../schemas/index.js";
import type {
  NewUser,
  NewUserProfile,
  User,
  UserProfile,
} from "../schemas/index.js";
import { BaseRepository } from "./base.repository.js";

export class UserRepository extends BaseRepository<typeof users, User, NewUser> {
  constructor(db: Database) {
    super(db, users);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    const result = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailNormalized, normalized),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const normalized = phone.replace(/\s/g, "");
    const result = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.phoneNormalized, normalized),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findByExternalId(
    externalId: string,
    provider: string,
  ): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.externalId, externalId),
          eq(users.authProvider, provider as User["authProvider"]),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findWithProfile(
    userId: string,
  ): Promise<(User & { profile: UserProfile | null }) | null> {
    const result = await this.db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
      with: { profile: true },
    });
    return result ?? null;
  }

  async searchByEmail(query: string, limit = 20): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .where(
        and(
          ilike(users.email, `%${query}%`),
          isNull(users.deletedAt),
        ),
      )
      .limit(limit);
  }

  async markEmailVerified(userId: string): Promise<User | null> {
    return this.update(userId, {
      isEmailVerified: true,
      verificationStatus: "email_verified",
    });
  }

  async updateLastLogin(userId: string, ip: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), lastLoginIp: ip })
      .where(eq(users.id, userId));
  }

  async ban(userId: string, reason: string): Promise<User | null> {
    return this.update(userId, {
      accountStatus: "banned",
      bannedAt: new Date(),
      banReason: reason,
    });
  }

  async suspend(userId: string, until: Date): Promise<User | null> {
    return this.update(userId, {
      accountStatus: "suspended",
      suspendedUntil: until,
    });
  }
}

export class UserProfileRepository extends BaseRepository<
  typeof userProfiles,
  UserProfile,
  NewUserProfile
> {
  constructor(db: Database) {
    super(db, userProfiles);
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const result = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return result[0] ?? null;
  }

  async upsert(data: NewUserProfile): Promise<UserProfile> {
    const result = await this.db
      .insert(userProfiles)
      .values(data)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          firstName: data.firstName,
          lastName: data.lastName,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          bio: data.bio,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0]!;
  }

  async incrementOrderCount(userId: string, amountCents: number): Promise<void> {
    await this.db
      .update(userProfiles)
      .set({
        totalOrderCount: sql`${userProfiles.totalOrderCount} + 1`,
        totalSpent: sql`${userProfiles.totalSpent} + ${amountCents}`,
      })
      .where(eq(userProfiles.userId, userId));
  }
}
