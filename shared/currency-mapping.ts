import type { Currency } from "./schema";

export const REGIONAL_OFFICE_CURRENCY_MAP: Record<string, Currency> = {
  "Hong Kong": "HKD",
  "Singapore": "SGD",
  "Shanghai": "CNY",
  "Australia": "AUD",
  "New Zealand": "NZD",
  "Indonesia": "IDR",
  "Malaysia": "MYR",
  "Guangzhou": "CNY",
} as const;

export function getCurrencyForRegionalOffice(regionalOffice: string | null | undefined): Currency {
  if (!regionalOffice) return "HKD";
  return REGIONAL_OFFICE_CURRENCY_MAP[regionalOffice] || "HKD";
}
