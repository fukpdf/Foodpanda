import type { AuthenticatedUser } from "./auth.types.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    sessionId?: string;
    deviceInfo: {
      ipAddress: string;
      userAgent: string;
      deviceId?: string;
    };
  }
}
