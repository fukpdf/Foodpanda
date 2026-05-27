import type { AuthenticatedPrincipal } from "../types/realtime.types.js";
import { authorizeChannel, isValidChannel } from "../auth/channel-auth.js";

export interface SubscribeValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSubscription(
  channel: string,
  principal: AuthenticatedPrincipal,
  currentSubscriptionCount: number,
  maxSubscriptionsPerSession = 20,
): SubscribeValidationResult {
  if (!isValidChannel(channel)) {
    return { valid: false, reason: `Invalid channel: "${channel}"` };
  }

  if (currentSubscriptionCount >= maxSubscriptionsPerSession) {
    return {
      valid: false,
      reason: `Maximum subscriptions per connection (${maxSubscriptionsPerSession}) reached`,
    };
  }

  const authResult = authorizeChannel(channel, principal);
  if (!authResult.allowed) {
    return { valid: false, reason: authResult.reason ?? "Unauthorized" };
  }

  return { valid: true };
}
