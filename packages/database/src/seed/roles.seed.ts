import { eq } from "drizzle-orm";
import type { Database } from "../client/index.js";
import { permissions, rolePermissions, roles } from "../schemas/index.js";

type RoleDefinition = {
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
};

const SYSTEM_ROLES: RoleDefinition[] = [
  {
    name: "superadmin",
    displayName: "Super Administrator",
    description: "Full platform access — all permissions granted implicitly",
    isSystem: true,
    permissions: ["*"],
  },
  {
    name: "admin",
    displayName: "Administrator",
    description: "Broad platform management — cannot modify superadmin users",
    isSystem: true,
    permissions: [
      "user:read", "user:update", "user:ban", "user:suspend",
      "vendor:read", "vendor:approve", "vendor:reject", "vendor:suspend",
      "rider:read", "rider:verify", "rider:suspend",
      "order:read", "order:cancel", "order:refund",
      "permission:read", "role:read",
      "analytics:read", "audit_log:read",
    ],
  },
  {
    name: "customer",
    displayName: "Customer",
    description: "Standard customer — can place orders and manage own profile",
    isSystem: true,
    permissions: ["order:create", "order:read"],
  },
  {
    name: "vendor",
    displayName: "Vendor",
    description: "Vendor owner — manages own restaurant and branches",
    isSystem: true,
    permissions: [
      "vendor:read", "vendor:update",
      "order:read", "order:update",
    ],
  },
  {
    name: "rider",
    displayName: "Rider",
    description: "Delivery rider — handles assigned deliveries",
    isSystem: true,
    permissions: ["order:read", "order:update"],
  },
];

export async function seedRoles(db: Database): Promise<void> {
  for (const roleDef of SYSTEM_ROLES) {
    const [role] = await db
      .insert(roles)
      .values({
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      })
      .onConflictDoUpdate({
        target: roles.name,
        set: { displayName: roleDef.displayName, description: roleDef.description },
      })
      .returning();

    if (!role) continue;

    if (roleDef.permissions.includes("*")) {
      console.log(`[seed] Role '${roleDef.name}' has wildcard permissions — skipping explicit links`);
      continue;
    }

    for (const permName of roleDef.permissions) {
      const [perm] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.name, permName))
        .limit(1);

      if (!perm) {
        console.warn(`[seed] Permission '${permName}' not found — skipping`);
        continue;
      }

      await db
        .insert(rolePermissions)
        .values({ roleId: role.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
  }

  console.log(`[seed] Upserted ${SYSTEM_ROLES.length} roles`);
}
