export interface IRequestSigner {
  sign(request: SignableRequest): Promise<string>;
  verify(request: SignableRequest, signature: string): Promise<boolean>;
}

export type SignableRequest = {
  method: string;
  path: string;
  timestamp: number;
  body?: string;
  headers?: Record<string, string>;
};

export type SignatureHeaders = {
  "x-signature": string;
  "x-timestamp": string;
  "x-nonce": string;
};

export function buildSignaturePayload(request: SignableRequest): string {
  const parts = [
    request.method.toUpperCase(),
    request.path,
    String(request.timestamp),
    request.body ?? "",
  ];
  return parts.join("\n");
}

export function isRequestTimestampValid(
  timestamp: number,
  toleranceSeconds = 300
): boolean {
  const diffMs = Math.abs(Date.now() - timestamp);
  return diffMs <= toleranceSeconds * 1000;
}

export function generateNonce(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    result += chars[byte % chars.length];
  }
  return result;
}

export type CsrfConfig = {
  tokenLength?: number;
  cookieName?: string;
  headerName?: string;
};

export const DEFAULT_CSRF_CONFIG: Required<CsrfConfig> = {
  tokenLength: 32,
  cookieName: "__Host-csrf",
  headerName: "x-csrf-token",
};

export function generateCsrfToken(length = DEFAULT_CSRF_CONFIG.tokenLength): string {
  return generateNonce(length);
}
