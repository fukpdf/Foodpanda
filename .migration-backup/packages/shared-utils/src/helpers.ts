import type { GeoCoordinate, Money, Currency } from "@deliveryos/shared-types";

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number; backoff?: boolean } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 500, backoff = true } = options;
  return new Promise(async (resolve, reject) => {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        return resolve(await fn());
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) return reject(error);
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await sleep(delay);
      }
    }
  });
}

export function calculateDistance(a: GeoCoordinate, b: GeoCoordinate): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x =
    sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateDeliveryEta(
  distanceKm: number,
  preparationMinutes: number,
  averageSpeedKmh = 25
): number {
  const transitMinutes = Math.ceil((distanceKm / averageSpeedKmh) * 60);
  return preparationMinutes + transitMinutes + 5;
}

export function createMoney(amount: number, currency: Currency): Money {
  return { amount, currency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error("Cannot add money with different currencies");
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {});
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((k) => delete result[k]);
  return result;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((k) => (result[k] = obj[k]));
  return result;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function parseEnv<T>(value: string | undefined, fallback: T, parse: (v: string) => T): T {
  if (value === undefined || value === "") return fallback;
  try {
    return parse(value);
  } catch {
    return fallback;
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Required environment variable ${key} is not set`);
  return value;
}
