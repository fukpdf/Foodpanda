export interface Env {
  ENVIRONMENT: string;
  API_GATEWAY_URL: string;
  RATE_LIMIT_KV: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
}

const BLOCKED_PATHS = ["/admin/_next/", "/vendor/_next/"];
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleCors(request);
    }

    const rateLimitResult = await checkRateLimit(request, env);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter),
          },
        }
      );
    }

    const response = await fetch(request);

    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newHeaders.set("X-Edge-Region", request.cf?.colo ?? "unknown");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};

function handleCors(request: Request): Response {
  const origin = request.headers.get("Origin") ?? "";
  const allowedOrigins = [
    "https://deliveryos.com",
    "https://vendor.deliveryos.com",
    "https://rider.deliveryos.com",
  ];

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
    "Access-Control-Max-Age": "86400",
  };

  if (allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return new Response(null, { status: 204, headers });
}

async function checkRateLimit(
  request: Request,
  env: Env
): Promise<{ allowed: boolean; retryAfter: number }> {
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown";

  const key = `rl:${ip}:${Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000))}`;

  try {
    const current = await env.RATE_LIMIT_KV.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= RATE_LIMIT_REQUESTS) {
      return { allowed: false, retryAfter: RATE_LIMIT_WINDOW_SECONDS };
    }

    await env.RATE_LIMIT_KV.put(key, String(count + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS * 2,
    });

    return { allowed: true, retryAfter: 0 };
  } catch {
    return { allowed: true, retryAfter: 0 };
  }
}
