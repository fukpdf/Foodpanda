import type { AuthenticatedPrincipal } from "../types/realtime.types.js";

export interface ChannelAuthResult {
  allowed: boolean;
  reason?: string;
}

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

  if (channel === "admin:dispatch" || channel === "admin:orders") {
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
  if (channel === "admin:dispatch" || channel === "admin:orders") return true;
  const parsed = parseChannel(channel);
  if (!parsed) return false;
  const validCategories = ["order", "customer", "vendor", "rider"];
  if (!validCategories.includes(parsed.category)) return false;
  if (!parsed.id || parsed.id.length === 0) return false;
  return true;
}

export function extractChannelCategory(channel: string): string | null {
  if (channel === "admin:dispatch" || channel === "admin:orders") return "admin";
  const parsed = parseChannel(channel);
  return parsed?.category ?? null;
}

export function extractChannelId(channel: string): string | null {
  const parsed = parseChannel(channel);
  return parsed?.id ?? null;
}
