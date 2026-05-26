export interface IEncryptionService {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
  hash(value: string): Promise<string>;
  verify(value: string, hash: string): Promise<boolean>;
}

export type EncryptionAlgorithm = "AES-256-GCM" | "ChaCha20-Poly1305";

export type EncryptedPayload = {
  algorithm: EncryptionAlgorithm;
  iv: string;
  ciphertext: string;
  tag: string;
  keyVersion: number;
};

export function encodeBase64(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return Buffer.from(data, "utf8").toString("base64url");
  }
  return Buffer.from(data).toString("base64url");
}

export function decodeBase64(data: string): Buffer {
  return Buffer.from(data, "base64url");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function maskSensitiveValue(
  value: string,
  visibleChars = 4,
  maskChar = "*"
): string {
  if (value.length <= visibleChars) return maskChar.repeat(value.length);
  return maskChar.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length > 2 ? 2 : 1;
  return `${local.slice(0, visible)}${"*".repeat(local.length - visible)}@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.slice(0, 3) + "*".repeat(phone.length - 6) + phone.slice(-3);
}
