import Stripe from "stripe";
import type { ResolvedPaymentEnv } from "../../config/env.js";

let _stripeClient: Stripe | null = null;

export function createStripeClient(env: ResolvedPaymentEnv): Stripe {
  if (_stripeClient) return _stripeClient;

  _stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
    maxNetworkRetries: env.STRIPE_MAX_NETWORK_RETRIES,
    timeout: 30_000,
    typescript: true,
    appInfo: {
      name: "DeliveryOS",
      version: "1.0.0",
      url: "https://deliveryos.com",
    },
  });

  return _stripeClient;
}

export type { Stripe };
