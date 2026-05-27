import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.isDev || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`), false);
      }
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Client-Version",
      "X-Device-ID",
    ],
    exposedHeaders: ["X-Request-ID", "X-Rate-Limit-Remaining"],
    credentials: true,
    maxAge: 86400,
  });
}
