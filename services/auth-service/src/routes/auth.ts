import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  logoutAllController,
  meController,
  sessionsController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../validators/auth.validators.js";
import { fail } from "../utils/response.js";

function validateBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw Object.assign(new Error(messages), { statusCode: 400 });
  }
  return result.data;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const authRateLimit = {
    config: {
      rateLimit: {
        max: env.RATE_LIMIT_AUTH_MAX,
        timeWindow: env.RATE_LIMIT_WINDOW_MS,
      },
    },
  };

  const registerRateLimit = {
    config: {
      rateLimit: {
        max: env.RATE_LIMIT_REGISTER_MAX,
        timeWindow: env.RATE_LIMIT_WINDOW_MS,
      },
    },
  };

  // POST /auth/register
  app.post(
    "/register",
    {
      ...registerRateLimit,
      schema: {
        tags: ["Auth"],
        summary: "Register a new user account",
        body: {
          type: "object",
          required: ["email", "password", "confirmPassword", "firstName", "lastName"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            confirmPassword: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            phone: { type: "string" },
            role: { type: "string", enum: ["customer", "vendor", "rider"] },
          },
        },
      },
    },
    async (request, reply) => {
      const body = validateBody(registerSchema, request.body);
      return registerController({ ...request, body } as any, reply);
    },
  );

  // POST /auth/login
  app.post(
    "/login",
    {
      ...authRateLimit,
      schema: {
        tags: ["Auth"],
        summary: "Authenticate with email and password",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
            device: {
              type: "object",
              properties: {
                deviceId: { type: "string" },
                deviceName: { type: "string" },
                deviceType: { type: "string", enum: ["web", "ios", "android", "unknown"] },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = validateBody(loginSchema, request.body);
      return loginController({ ...request, body } as any, reply);
    },
  );

  // POST /auth/refresh
  app.post(
    "/refresh",
    {
      ...authRateLimit,
      schema: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue new access token",
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = validateBody(refreshSchema, request.body);
      return refreshController({ ...request, body } as any, reply);
    },
  );

  // POST /auth/logout
  app.post(
    "/logout",
    { preHandler: authenticate },
    logoutController,
  );

  // POST /auth/logout-all
  app.post(
    "/logout-all",
    { preHandler: authenticate },
    logoutAllController,
  );

  // GET /auth/me
  app.get(
    "/me",
    { preHandler: authenticate },
    meController,
  );

  // GET /auth/sessions
  app.get(
    "/sessions",
    { preHandler: authenticate },
    sessionsController,
  );

  // GET /auth/public-key — allows API gateway and other services to fetch the public key
  app.get(
    "/public-key",
    {},
    async (_request, reply) => {
      return reply.status(200).send({
        publicKey: env.rsaKeys.publicKeyPem,
        algorithm: "RS256",
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });
    },
  );

  // Future-ready stub: POST /auth/otp/request
  // Architecture placeholder — returns 501 until OTP service is built
  app.post(
    "/otp/request",
    {},
    async (_request, reply) => {
      return reply.status(501).send(
        fail("NOT_IMPLEMENTED", "OTP authentication is not yet available"),
      );
    },
  );
}
