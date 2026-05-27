import type { FastifyRequest, FastifyReply } from "fastify";
import type { Database } from "@deliveryos/database";
import { fail } from "../utils/response.js";

export function requirePermission(db: Database, permission: string) {
  return async function permissionGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
    }

    if (
      request.user.role === "superadmin" ||
      request.user.role === "admin"
    ) {
      return;
    }

    // TODO Phase 5: query user_permissions + role_permissions tables here
    // For now, use role-based defaults until permission cache (Redis) is built
    const [resource, action] = permission.split(":");
    const allowed = isRoleAllowedDefault(request.user.role, resource, action);

    if (!allowed) {
      return reply.status(403).send(
        fail("FORBIDDEN", `Missing required permission: ${permission}`),
      );
    }
  };
}

function isRoleAllowedDefault(
  role: string,
  resource: string,
  action: string,
): boolean {
  const defaults: Record<string, string[]> = {
    customer: ["order:read", "order:create"],
    vendor: ["vendor:read", "vendor:update", "order:read", "order:update"],
    rider: ["order:read", "order:update"],
  };

  const allowed = defaults[role] ?? [];
  return allowed.includes(`${resource}:${action}`);
}
