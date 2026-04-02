import { distance } from "fastest-levenshtein";
import { db } from "../db";
import { customers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { Customer } from "@shared/schema";

export type MatchConfidence = "exact_id" | "exact_email" | "exact_name" | "fuzzy_name" | "none";

export type MatchResult = {
  customer: Customer | null;
  confidence: MatchConfidence;
  conflicts: Array<{ field: string; crmValue: string; nsValue: string }>;
};

const FUZZY_THRESHOLD = 0.8;

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

export async function matchNsCustomer(
  nsId: string,
  nsEmail: string | undefined,
  nsName: string
): Promise<MatchResult> {
  // Priority 1: NS internal ID already stored on CRM customer
  const byNsId = await db
    .select()
    .from(customers)
    .where(eq(customers.netsuiteInternalId, nsId))
    .limit(1);
  if (byNsId.length > 0) {
    return { customer: byNsId[0], confidence: "exact_id", conflicts: [] };
  }

  // Priority 2: Exact email
  if (nsEmail) {
    const byEmail = await db
      .select()
      .from(customers)
      .where(sql`LOWER(${customers.email}) = LOWER(${nsEmail})`)
      .limit(1);
    if (byEmail.length > 0) {
      return { customer: byEmail[0], confidence: "exact_email", conflicts: [] };
    }
  }

  // Priority 3: Exact name
  const byExactName = await db
    .select()
    .from(customers)
    .where(sql`LOWER(${customers.name}) = LOWER(${nsName})`)
    .limit(1);
  if (byExactName.length > 0) {
    return { customer: byExactName[0], confidence: "exact_name", conflicts: [] };
  }

  // Priority 4: Fuzzy name
  const allActive = await db
    .select()
    .from(customers)
    .where(eq(customers.isDeleted, false));

  let bestMatch: Customer | null = null;
  let bestScore = 0;
  for (const c of allActive) {
    const score = similarity(c.name, nsName);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = c;
    }
  }

  if (bestScore >= FUZZY_THRESHOLD && bestMatch) {
    return { customer: bestMatch, confidence: "fuzzy_name", conflicts: [] };
  }

  return { customer: null, confidence: "none", conflicts: [] };
}

export function detectConflicts(
  crmCustomer: Customer,
  nsValues: { email?: string; phone?: string; country?: string }
): Array<{ field: string; crmValue: string; nsValue: string }> {
  const conflicts: Array<{ field: string; crmValue: string; nsValue: string }> = [];

  const check = (field: "email" | "phone" | "country", nsValue: string | undefined) => {
    const crmValue = crmCustomer[field];
    if (crmValue && nsValue && crmValue.toLowerCase() !== nsValue.toLowerCase()) {
      conflicts.push({ field, crmValue, nsValue });
    }
  };

  check("email", nsValues.email);
  check("phone", nsValues.phone);
  check("country", nsValues.country);

  return conflicts;
}

// Gap-fill: only write fields that are currently empty in CRM (never overwrite)
export function gapFillCustomer(
  crmCustomer: Customer,
  nsPatch: Partial<Customer>
): Partial<Customer> {
  const updates: Partial<Customer> = {};

  for (const [key, value] of Object.entries(nsPatch) as [keyof Customer, any][]) {
    if (
      value !== undefined &&
      value !== null &&
      (crmCustomer[key] === null || crmCustomer[key] === undefined || crmCustomer[key] === "")
    ) {
      (updates as any)[key] = value;
    }
  }

  // Always update netsuiteUrl so the link stays fresh
  if (nsPatch.netsuiteUrl) {
    updates.netsuiteUrl = nsPatch.netsuiteUrl;
  }

  return updates;
}
