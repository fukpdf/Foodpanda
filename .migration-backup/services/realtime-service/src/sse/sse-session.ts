import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthenticatedPrincipal } from "../types/realtime.types.js";

export interface RealtimeSseSession {
  id: string;
  principal: AuthenticatedPrincipal;
  channel: string;
  connectedAt: Date;
  ip: string;
  userAgent: string;
  send: (event: string, data: unknown) => void;
  sendComment: (comment: string) => void;
  close: () => void;
}

export function createSseSession(params: {
  id: string;
  principal: AuthenticatedPrincipal;
  channel: string;
  ip: string;
  userAgent: string;
  request: FastifyRequest;
  reply: FastifyReply;
}): RealtimeSseSession {
  const { id, principal, channel, ip, userAgent, reply } = params;

  const send = (event: string, data: unknown): void => {
    try {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
    }
  };

  const sendComment = (comment: string): void => {
    try {
      reply.raw.write(`: ${comment}\n\n`);
    } catch {
    }
  };

  const close = (): void => {
    try {
      reply.raw.end();
    } catch {
    }
  };

  return {
    id,
    principal,
    channel,
    connectedAt: new Date(),
    ip,
    userAgent,
    send,
    sendComment,
    close,
  };
}
