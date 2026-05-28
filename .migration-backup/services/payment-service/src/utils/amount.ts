export const SUPPORTED_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "SGD",
  "MYR",
  "PHP",
  "THB",
  "IDR",
  "AUD",
  "CAD",
]);

export const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function validateAmountCents(amountCents: number, currency: string): void {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`amountCents must be an integer, got: ${amountCents}`);
  }

  if (amountCents <= 0) {
    throw new Error(`amountCents must be positive, got: ${amountCents}`);
  }

  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const minAmount = isZeroDecimal ? 1 : 50;

  if (amountCents < minAmount) {
    throw new Error(
      `amountCents ${amountCents} is below minimum ${minAmount} for currency ${currency}`,
    );
  }
}

export function validateCurrency(currency: string): string {
  const upper = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(upper)) {
    throw new Error(
      `Unsupported currency: ${currency}. Supported: ${Array.from(SUPPORTED_CURRENCIES).join(", ")}`,
    );
  }
  return upper;
}

export function centsToDecimal(amountCents: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
    return amountCents;
  }
  return amountCents / 100;
}
