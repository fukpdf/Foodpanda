import type { FastifyRequest, FastifyReply } from "fastify";
import { fail } from "../utils/response.js";

type UserRole = "customer" | "vendor" | "rider" | "admin" | "superadmin";

export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
    }

    const userRole = request.user.role as UserRole;

    if (userRole === "superadmin") return;

    if (!roles.includes(userRole)) {
      return reply.status(403).send(
        fail(
          "FORBIDDEN",
          `Access denied — required role: ${roles.join(" or ")}`,
        ),
      );
    }
  };
}

export function requireAdmin() {
  return requireRole("admin", "superadmin");
}

export function requireSelf(userIdParam = "userId") {
  return async function selfGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
    }
    const paramId = (request.params as Record<string, string>)[userIdParam];
    const isAdmin =
      request.user.role === "admin" || request.user.role === "superadmin";

    if (!isAdmin && paramId && paramId !== request.user.userId) {
      return reply.status(403).send(fail("FORBIDDEN", "You can only access your own data"));
    }
  };
}
