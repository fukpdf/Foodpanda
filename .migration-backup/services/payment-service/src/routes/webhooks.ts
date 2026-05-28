import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebhookHandler } from "../handlers/webhook.handler.js";

export async function registerWebhookRoutes(
  app: FastifyInstance,
  webhookHandler: WebhookHandler,
): Promise<void> {
  await app.register(async (instance) => {
    instance.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_req: FastifyRequest, body: Buffer, done: (err: Error | null, data: unknown) => void) => {
        done(null, body);
      },
    );

    instance.post(
      "/webhooks/stripe",
      {
        config: {
          rateLimit: {
            max: 2000,
            timeWindow: 60_000,
            keyGenerator: () => "stripe-webhook",
          },
        },
      },
      async (request, reply) => {
        const rawBody = request.body as Buffer;
        const signature = request.headers["stripe-signature"];

        if (!signature || typeof signature !== "string") {
          return reply.status(400).send({
            success: false,
            error: {
              code: "MISSING_SIGNATURE",
              message: "stripe-signature header is required",
              timestamp: new Date().toISOString(),
            },
          });
        }

        await webhookHandler.handle(rawBody, signature);

        return reply.status(200).send({ received: true });
      },
    );
  });
}
