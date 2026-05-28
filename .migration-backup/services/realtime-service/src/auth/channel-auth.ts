import type { AuthenticatedPrincipal } from "../types/realtime.types.js";

export interface ChannelAuthResult {
  allowed: boolean;
  reason?: string;
}

const MAX_CHANNEL_LENGTH = 256;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_CATEGORIES = new Set(["order", "customer", "vendor", "rider"]);

function parseChannel(channel: string): { category: string; id: string } | null {
  const colonIdx = channel.indexOf(":");
  if (colonIdx === -1) return null;
  return {
    category: channel.slice(0, colonIdx),
    id: channel.slice(colonIdx + 1),
  };
}

export function authorizeChannel(
  channel: string,
  principal: AuthenticatedPrincipal,
): ChannelAuthResult {
  const { role, userId } = principal;
  const isAdmin = role === "admin" || role === "superadmin";

  if (
    channel === "admin:dispatch" ||
    channel === "admin:orders" ||
    channel === "admin:payments"
  ) {
    if (isAdmin) return { allowed: true };
    return { allowed: false, reason: "Admin-only channel" };
  }

  const parsed = parseChannel(channel);
  if (!parsed) {
    return { allowed: false, reason: `Invalid channel format: ${channel}` };
  }

  const { category, id } = parsed;

  switch (category) {
    case "order": {
      if (isAdmin) return { allowed: true };
      return { allowed: true };
    }

    case "customer": {
      if (isAdmin) return { allowed: true };
      if (role === "customer" && userId === id) return { allowed: true };
      return {
        allowed: false,
        reason: "You can only subscribe to your own customer channel",
      };
    }

    case "vendor": {
      if (isAdmin) return { allowed: true };
      if (role === "vendor") return { allowed: true };
      return { allowed: false, reason: "Vendor-only channel" };
    }

    case "rider": {
      if (isAdmin) return { allowed: true };
      if (role === "rider" && userId === id) return { allowed: true };
      return {
        allowed: false,
        reason: "You can only subscribe to your own rider channel",
      };
    }

    default:
      return { allowed: false, reason: `Unknown channel category: ${category}` };
  }
}

export function isValidChannel(channel: string): boolean {
  if (typeof channel !== "string") return false;
  if (channel.length === 0 || channel.length > MAX_CHANNEL_LENGTH) return false;

  if (
    channel === "admin:dispatch" ||
    channel === "admin:orders" ||
    channel === "admin:payments"
  )
    return true;

  const parsed = parseChannel(channel);
  if (!parsed) return false;

  const { category, id } = parsed;

  if (!UUID_CATEGORIES.has(category)) return false;
  if (!id || id.length === 0) return false;
  if (!UUID_REGEX.test(id)) return false;

  return true;
}

export function extractChannelCategory(channel: string): string | null {
  if (
    channel === "admin:dispatch" ||
    channel === "admin:orders" ||
    channel === "admin:payments"
  )
    return "admin";
  const parsed = parseChannel(channel);
  return parsed?.category ?? null;
}

export function extractChannelId(channel: string): string | null {
  const parsed = parseChannel(channel);
  return parsed?.id ?? null;
}
