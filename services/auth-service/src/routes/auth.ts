import type { FastifyInstance } from "fastify";
import {
  LoginBodySchema,
  RegisterBodySchema,
  RefreshTokenBodySchema,
  ForgotPasswordBodySchema,
  ResetPasswordBodySchema,
  VerifyEmailBodySchema,
  AuthResponseSchema,
} from "../schemas/auth.schema.js";
import type { LoginCredentials, RegisterPayload } from "@deliveryos/shared-types";
import { HTTP_STATUS } from "@deliveryos/shared-utils";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginCredentials }>(
    "/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Authenticate with email and password",
        body: LoginBodySchema,
        response: { 200: AuthResponseSchema },
      },
    },
    async (request, reply) => {
      request.log.info({ email: request.body.email }, "Login attempt");
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: {
          accessToken: "placeholder-access-token",
          refreshToken: "placeholder-refresh-token",
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
          tokenType: "Bearer",
        },
      });
    }
  );

  app.post<{ Body: RegisterPayload }>(
    "/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Register a new user account",
        body: RegisterBodySchema,
      },
    },
    async (request, reply) => {
      request.log.info({ email: request.body.email }, "Registration attempt");
      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: { message: "Verification email sent. Please check your inbox." },
      });
    }
  );

  app.post(
    "/refresh",
    {
      schema: {
        tags: ["Auth"],
        summary: "Refresh access token using a valid refresh token",
        body: RefreshTokenBodySchema,
      },
    },
    async (_request, reply) => {
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: {
          accessToken: "placeholder-new-access-token",
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
          tokenType: "Bearer",
        },
      });
    }
  );

  app.post(
    "/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Invalidate the current session",
      },
    },
    async (_request, reply) => {
      return reply.status(HTTP_STATUS.NO_CONTENT).send();
    }
  );

  app.post(
    "/forgot-password",
    {
      schema: {
        tags: ["Auth"],
        summary: "Request a password reset email",
        body: ForgotPasswordBodySchema,
      },
    },
    async (_request, reply) => {
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: { message: "If the account exists, a reset email has been sent." },
      });
    }
  );

  app.post(
    "/reset-password",
    {
      schema: {
        tags: ["Auth"],
        summary: "Reset password using a valid reset token",
        body: ResetPasswordBodySchema,
      },
    },
    async (_request, reply) => {
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: { message: "Password updated successfully." },
      });
    }
  );

  app.post(
    "/verify-email",
    {
      schema: {
        tags: ["Auth"],
        summary: "Verify email address with token",
        body: VerifyEmailBodySchema,
      },
    },
    async (_request, reply) => {
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: { message: "Email verified successfully." },
      });
    }
  );

  app.get(
    "/me",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get the currently authenticated user profile",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
        });
      }
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: { message: "Auth context endpoint placeholder" },
      });
    }
  );
}
