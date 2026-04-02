import { db } from "../db";
import {
  customers,
  netsuiteSyncLog,
  syncConflicts,
  netsuiteOrders,
  netsuiteProducts,
  syncCursors,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { runSuiteQL, nsPost, nsPatch as nsPatchReq } from "./netsuite-client";
import {
  nsCustomerToCrmPatch,
  nsSalesOrderToCrmOrder,
  nsItemToCrmProduct,
  type NSCustomer,
  type NSSalesOrder,
  type NSItem,
} from "./netsuite-transforms";
import { matchNsCustomer, detectConflicts, gapFillCustomer } from "./customer-matcher";

interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  errors: number;
}

async function getCursor(key: string): Promise<string | null> {
  const [row] = await db.select().from(syncCursors).where(eq(syncCursors.key, key));
  return row?.value ?? null;
}

async function setCursor(key: string, value: string): Promise<void> {
  await db
    .insert(syncCursors)
    .values({ key, value })
    .onConflictDoUpdate({ target: syncCursors.key, set: { value, updatedAt: new Date() } });
}

async function logSync(
  syncType: string,
  status: "success" | "error" | "partial",
  result: Partial<SyncResult>,
  errorMessage?: string
): Promise<void> {
  await db.insert(netsuiteSyncLog).values({
    syncType,
    status,
    recordsProcessed: result.processed ?? 0,
    recordsCreated: result.created ?? 0,
    recordsUpdated: result.updated ?? 0,
    errorMessage: errorMessage ?? null,
    completedAt: new Date(),
  });
}

export async function customerSyncFromNS(): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: 0 };

  try {
    const lastSync = await getCursor("customers_last_sync");
    const dateFilter = lastSync
      ? `AND c.lastmodifieddate >= TO_DATE('${lastSync}', 'YYYY-MM-DD')`
      : "";

    const rows: NSCustomer[] = await runSuiteQL(
      `SELECT c.id, c.entityid, c.companyname, c.email, c.phone, c.defaultaddress, c.country
       FROM customer c
       WHERE c.isinactive = 'F' ${dateFilter}
       ORDER BY c.lastmodifieddate DESC`
    );

    for (const ns of rows) {
      result.processed++;
      try {
        const nsPatch = nsCustomerToCrmPatch(ns);
        const { customer: match } = await matchNsCustomer(
          ns.id,
          ns.email,
          nsPatch.name ?? ns.entityid
        );

        if (match) {
          const conflicts = detectConflicts(match, {
            email: ns.email,
            phone: ns.phone,
            country: nsPatch.country ?? undefined,
          });

          if (conflicts.length > 0) {
            for (const c of conflicts) {
              await db.insert(syncConflicts).values({
                customerId: match.id,
                nsInternalId: ns.id,
                conflictType: "field_mismatch",
                fieldName: c.field,
                crmValue: c.crmValue,
                nsValue: c.nsValue,
              });
            }
          }

          const updates = gapFillCustomer(match, nsPatch);
          updates.netsuiteInternalId = ns.id;
          updates.netsuiteSyncedAt = new Date();

          await db.update(customers).set(updates).where(eq(customers.id, match.id));
          result.updated++;
        } else {
          await db.insert(customers).values({
            ...nsPatch,
            name: nsPatch.name ?? ns.entityid,
            stage: "lead",
            netsuiteInternalId: ns.id,
            netsuiteSyncedAt: new Date(),
            isDeleted: false,
          });
          result.created++;
        }
      } catch (err) {
        result.errors++;
        console.error(`[NetSuite] Customer sync error for NS id=${ns.id}:`, err);
      }
    }

    await setCursor("customers_last_sync", new Date().toISOString().split("T")[0]);
    await logSync("customers", "success", result);
    return result;
  } catch (err: any) {
    await logSync("customers", "error", result, err.message);
    throw err;
  }
}

export async function salesOrderSyncFromNS(): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: 0 };

  try {
    const lastSync = await getCursor("orders_last_sync");
    const dateFilter = lastSync
      ? `AND so.trandate >= TO_DATE('${lastSync}', 'YYYY-MM-DD')`
      : "";

    const rows: NSSalesOrder[] = await runSuiteQL(
      `SELECT so.id, so.tranid, so.entity, so.total, so.foreigntotal, so.currency,
              so.trandate, so.status
       FROM salesorder so
       WHERE so.voided = 'F' ${dateFilter}
       ORDER BY so.trandate DESC`
    );

    for (const ns of rows) {
      result.processed++;
      try {
        const [linkedCustomer] = await db
          .select()
          .from(customers)
          .where(eq(customers.netsuiteInternalId, ns.entity.id))
          .limit(1);

        const orderData = nsSalesOrderToCrmOrder(ns, linkedCustomer?.id);

        await db
          .insert(netsuiteOrders)
          .values(orderData)
          .onConflictDoUpdate({
            target: netsuiteOrders.nsOrderId,
            set: {
              customerId: orderData.customerId,
              amount: orderData.amount,
              currency: orderData.currency,
              status: orderData.status,
              tranDate: orderData.tranDate,
              items: orderData.items,
              syncedAt: new Date(),
            },
          });

        result.created++;
      } catch (err) {
        result.errors++;
        console.error(`[NetSuite] Order sync error for NS id=${ns.id}:`, err);
      }
    }

    await setCursor("orders_last_sync", new Date().toISOString().split("T")[0]);
    await logSync("orders", "success", result);
    return result;
  } catch (err: any) {
    await logSync("orders", "error", result, err.message);
    throw err;
  }
}

export async function productCatalogueSync(): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: 0 };

  try {
    const rows: NSItem[] = await runSuiteQL(
      `SELECT i.id, i.itemid, i.displayname, i.salesprice, i.currency, i.itemtype, i.isinactive
       FROM item i
       WHERE i.itemtype IN ('InvtPart', 'NonInvtPart', 'Service')
       ORDER BY i.itemid`
    );

    for (const ns of rows) {
      result.processed++;
      try {
        const productData = nsItemToCrmProduct(ns);

        await db
          .insert(netsuiteProducts)
          .values(productData)
          .onConflictDoUpdate({
            target: netsuiteProducts.nsItemId,
            set: {
              displayName: productData.displayName,
              salePrice: productData.salePrice,
              isActive: productData.isActive,
              syncedAt: new Date(),
            },
          });

        result.created++;
      } catch (err) {
        result.errors++;
        console.error(`[NetSuite] Product sync error for NS id=${ns.id}:`, err);
      }
    }

    await setCursor("products_last_sync", new Date().toISOString().split("T")[0]);
    await logSync("products", "success", result);
    return result;
  } catch (err: any) {
    await logSync("products", "error", result, err.message);
    throw err;
  }
}

export async function pushCustomerToNS(customerId: string): Promise<void> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId));

  if (!customer) throw new Error(`Customer ${customerId} not found`);

  const nsPayload = {
    companyname: customer.name,
    ...(customer.email ? { email: customer.email } : {}),
    ...(customer.phone ? { phone: customer.phone } : {}),
  };

  if (customer.netsuiteInternalId) {
    await nsPatchReq(`/record/v1/customer/${customer.netsuiteInternalId}`, nsPayload);
  } else {
    const created = await nsPost("/record/v1/customer", nsPayload);
    const nsId = created?.id as string | undefined;
    if (nsId) {
      await db.update(customers).set({
        netsuiteInternalId: nsId,
        netsuiteSyncedAt: new Date(),
        netsuiteUrl: `https://system.netsuite.com/app/common/entity/custjob.nl?id=${nsId}`,
      }).where(eq(customers.id, customerId));
    }
  }
}
