import { closeDatabase, getDatabase } from "../client/index.js";
import { seedAdminUser } from "./admin.seed.js";
import { seedPermissions } from "./permissions.seed.js";
import { seedRoles } from "./roles.seed.js";

async function seed(): Promise<void> {
  console.log("[seed] Starting database seeding...");
  const db = getDatabase();

  try {
    console.log("[seed] Step 1/3: Seeding permissions...");
    await seedPermissions(db);

    console.log("[seed] Step 2/3: Seeding roles...");
    await seedRoles(db);

    console.log("[seed] Step 3/3: Seeding demo admin user...");
    await seedAdminUser(db);

    console.log("[seed] Database seeding complete.");
  } catch (err) {
    console.error("[seed] Seeding failed:", err);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

seed();
