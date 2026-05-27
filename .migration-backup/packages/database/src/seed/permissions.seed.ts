import type { Database } from "../client/index.js";
import { permissions } from "../schemas/index.js";

const PERMISSION_DEFINITIONS = [
  { resource: "user", action: "read", displayName: "Read Users" },
  { resource: "user", action: "create", displayName: "Create Users" },
  { resource: "user", action: "update", displayName: "Update Users" },
  { resource: "user", action: "delete", displayName: "Delete Users" },
  { resource: "user", action: "ban", displayName: "Ban Users" },
  { resource: "user", action: "suspend", displayName: "Suspend Users" },

  { resource: "vendor", action: "read", displayName: "Read Vendors" },
  { resource: "vendor", action: "create", displayName: "Create Vendors" },
  { resource: "vendor", action: "update", displayName: "Update Vendors" },
  { resource: "vendor", action: "delete", displayName: "Delete Vendors" },
  { resource: "vendor", action: "approve", displayName: "Approve Vendors" },
  { resource: "vendor", action: "reject", displayName: "Reject Vendors" },
  { resource: "vendor", action: "suspend", displayName: "Suspend Vendors" },

  { resource: "rider", action: "read", displayName: "Read Riders" },
  { resource: "rider", action: "create", displayName: "Create Riders" },
  { resource: "rider", action: "update", displayName: "Update Riders" },
  { resource: "rider", action: "verify", displayName: "Verify Riders" },
  { resource: "rider", action: "suspend", displayName: "Suspend Riders" },

  { resource: "order", action: "read", displayName: "Read Orders" },
  { resource: "order", action: "create", displayName: "Create Orders" },
  { resource: "order", action: "update", displayName: "Update Orders" },
  { resource: "order", action: "cancel", displayName: "Cancel Orders" },
  { resource: "order", action: "refund", displayName: "Refund Orders" },

  { resource: "permission", action: "read", displayName: "Read Permissions" },
  { resource: "permission", action: "assign", displayName: "Assign Permissions" },

  { resource: "role", action: "read", displayName: "Read Roles" },
  { resource: "role", action: "assign", displayName: "Assign Roles" },

  { resource: "analytics", action: "read", displayName: "Read Analytics" },
  { resource: "audit_log", action: "read", displayName: "Read Audit Logs" },
] as const;

export async function seedPermissions(db: Database): Promise<void> {
  const values = PERMISSION_DEFINITIONS.map((p) => ({
    name: `${p.resource}:${p.action}`,
    resource: p.resource,
    action: p.action,
    displayName: p.displayName,
    isSystem: true,
  }));

  await db
    .insert(permissions)
    .values(values)
    .onConflictDoUpdate({
      target: permissions.name,
      set: { displayName: permissions.displayName },
    });

  console.log(`[seed] Upserted ${values.length} permissions`);
}
