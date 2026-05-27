import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { EventHandler } from "../handlers/event.handler.js";
import { env } from "../config/env.js";
import { fail } from "../utils/response.js";

const InternalEventSchema = z.object({
  channel: z.string().min(1),
  event: z.object({
    eventId: z.string().uuid(),
    eventType: z.string().min(1),
    orderId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    version: z.number().int().min(1),
    source: z.string().min(1),
    payload: z.record(z.unknown()),
  }),
});

export async function registerEventsRoute(
  app: FastifyInstance,
  handler: EventHandler,
): Promise<void> {
  app.post("/internal/events", async (request, reply) => {
    const internalKey = request.headers["x-internal-key"];
    if (internalKey !== env.INTERNAL_API_KEY) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Invalid internal API key"));
    }

    const parsed = InternalEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid payload"));
    }

    try {
      handler.handle(parsed.data);
      return reply.status(202).send({ accepted: true });
    } catch (err) {
      app.log.error({ err }, "Failed to handle internal event");
      return reply.status(500).send(fail("INTERNAL_ERROR", "Event processing failed"));
    }
  });
}
