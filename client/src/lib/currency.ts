import type { Currency } from "@shared/schema";
import { CURRENCIES as ALL_CURRENCIES } from "@shared/schema";

export const CURRENCIES = ALL_CURRENCIES;

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  HKD: "HK$",
  SGD: "S$",
  CNY: "¥",
  AUD: "A$",
  NZD: "NZ$",
  IDR: "IDR ",
  MYR: "RM",
};

// Currency display names
export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "US Dollar",
  HKD: "Hong Kong Dollar",
  SGD: "Singapore Dollar",
  CNY: "Chinese Yuan",
  AUD: "Australian Dollar",
  NZD: "New Zealand Dollar",
  IDR: "Indonesian Rupiah",
  MYR: "Malaysian Ringgit",
};

// Default currency for each regional office
export const REGIONAL_OFFICE_CURRENCIES: Record<string, Currency> = {
  "Hong Kong": "HKD",
  "Singapore": "SGD",
  "Shanghai": "CNY",
  "Guangzhou": "CNY",
  "Australia": "AUD",
  "New Zealand": "NZD",
  "Indonesia": "IDR",
  "Malaysia": "MYR",
};

/**
 * Fetches exchange rate from API or cache
 * For now, returns a static rate from the exchange_rates table
 */
export async function getExchangeRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;

  try {
    const response = await fetch(`/api/exchange-rates?from=${from}&to=${to}`);
    if (!response.ok) throw new Error("Failed to fetch exchange rate");
    const data = await response.json();
    return parseFloat(data.rate);
  } catch (error) {
    console.error(`Failed to get exchange rate from ${from} to ${to}:`, error);
    // Return 1 as fallback to prevent errors
    return 1;
  }
}

/**
 * Converts an amount from one currency to another
 */
export async function convertCurrency(
  amount: number | string,
  from: Currency,
  to: Currency
): Promise<number> {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 0;

  const rate = await getExchangeRate(from, to);
  return numAmount * rate;
}

const ZERO_DECIMAL_CURRENCIES: Currency[] = ["IDR"];

function getDefaultDecimals(currency: Currency, _amount: number): number {
  if (ZERO_DECIMAL_CURRENCIES.includes(currency)) return 0;
  return 2;
}

/**
 * Formats a number as currency with proper symbol and formatting
 */
export function formatCurrency(
  amount: number | string,
  currency: Currency,
  options: {
    showSymbol?: boolean;
    decimals?: number;
  } = {}
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const showSymbol = options.showSymbol ?? true;
  const decimals = options.decimals ?? getDefaultDecimals(currency, numAmount);

  if (isNaN(numAmount)) return showSymbol ? `${CURRENCY_SYMBOLS[currency]}0` : "0";

  const formatted = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return showSymbol ? `${CURRENCY_SYMBOLS[currency]}${formatted}` : formatted;
}

/**
 * Formats a number in compact form with M/B suffixes
 */
export function formatCompactCurrency(
  amount: number | string,
  currency: Currency,
  options: { showSymbol?: boolean } = {}
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const showSymbol = options.showSymbol ?? true;
  const symbol = showSymbol ? CURRENCY_SYMBOLS[currency] : "";

  if (isNaN(numAmount)) return `${symbol}0`;

  const abs = Math.abs(numAmount);
  const sign = numAmount < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    return `${sign}${symbol}${val.toFixed(val >= 10 ? 1 : 2)}B`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}${symbol}${val.toFixed(val >= 10 ? 1 : 2)}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}${symbol}${val.toFixed(val >= 10 ? 0 : 1)}K`;
  }

  return `${sign}${symbol}${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Formats currency with conversion
 * Takes an amount in one currency and displays it in another
 */
export async function formatConvertedCurrency(
  amount: number | string,
  from: Currency,
  to: Currency,
  options?: {
    showSymbol?: boolean;
    decimals?: number;
  }
): Promise<string> {
  const converted = await convertCurrency(amount, from, to);
  return formatCurrency(converted, to, options);
}

/**
 * Formats a raw number string with thousand-separator commas for display in inputs.
 * Strips existing commas, splits on decimal, formats integer part only.
 */
export function formatAmountInput(raw: string): string {
  const stripped = raw.replace(/,/g, "");
  if (!stripped) return "";
  const [intPart, decPart] = stripped.split(".");
  const formatted = parseInt(intPart || "0", 10).toLocaleString("en-US");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

/**
 * Strips commas from a formatted amount string before sending to the API.
 */
export function stripAmountCommas(val: string): string {
  return val.replace(/,/g, "");
}

/**
 * Converts base currency amount (USD) to target currency
 */
export async function convertFromBase(
  baseAmount: number | string,
  targetCurrency: Currency
): Promise<number> {
  return convertCurrency(baseAmount, "USD", targetCurrency);
}

/**
 * Converts any amount to base currency (USD)
 */
export async function convertToBase(
  amount: number | string,
  sourceCurrency: Currency
): Promise<number> {
  return convertCurrency(amount, sourceCurrency, "USD");
}
