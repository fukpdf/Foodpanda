import { eq } from "drizzle-orm";
import type { Database } from "../client/index.js";
import { roles, userProfiles, userRoles, users } from "../schemas/index.js";

const DEMO_ADMIN = {
  email: "admin@deliveryos.local",
  firstName: "Platform",
  lastName: "Admin",
  displayName: "DeliveryOS Admin",
};

export async function seedAdminUser(db: Database): Promise<void> {
  const normalized = DEMO_ADMIN.email.toLowerCase().trim();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, normalized))
    .limit(1);

  if (existing.length > 0) {
    console.log("[seed] Admin user already exists — skipping");
    return;
  }

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_ADMIN.email,
      emailNormalized: normalized,
      passwordHash: "CHANGE_ME_BEFORE_PRODUCTION",
      primaryRole: "admin",
      accountStatus: "active",
      verificationStatus: "fully_verified",
      isEmailVerified: true,
    })
    .returning();

  if (!user) return;

  await db.insert(userProfiles).values({
    userId: user.id,
    firstName: DEMO_ADMIN.firstName,
    lastName: DEMO_ADMIN.lastName,
    displayName: DEMO_ADMIN.displayName,
  });

  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "admin"))
    .limit(1);

  if (adminRole) {
    await db.insert(userRoles).values({
      userId: user.id,
      roleId: adminRole.id,
    });
  }

  console.log(`[seed] Created demo admin user: ${DEMO_ADMIN.email}`);
  console.warn("[seed] IMPORTANT: Change the admin password hash before deploying to production!");
}
