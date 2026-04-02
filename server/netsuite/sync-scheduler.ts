import cron from "node-cron";
import { getNsCredentials } from "./netsuite-auth";
import { customerSyncFromNS, salesOrderSyncFromNS, productCatalogueSync } from "./sync-service";

export function startSyncScheduler(): void {
  if (!getNsCredentials()) {
    console.log("[NetSuite] Credentials not configured — sync scheduler disabled");
    return;
  }

  console.log("[NetSuite] Starting sync scheduler");

  // Customer sync: every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[NetSuite] Running customer sync...");
    try {
      const r = await customerSyncFromNS();
      console.log(
        `[NetSuite] Customer sync: ${r.processed} processed, ${r.created} created, ${r.updated} updated, ${r.errors} errors`
      );
    } catch (err) {
      console.error("[NetSuite] Customer sync failed:", err);
    }
  });

  // Sales order sync: every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("[NetSuite] Running sales order sync...");
    try {
      const r = await salesOrderSyncFromNS();
      console.log(`[NetSuite] Order sync: ${r.processed} processed, ${r.errors} errors`);
    } catch (err) {
      console.error("[NetSuite] Order sync failed:", err);
    }
  });

  // Product catalogue sync: daily at 2am
  cron.schedule("0 2 * * *", async () => {
    console.log("[NetSuite] Running product catalogue sync...");
    try {
      const r = await productCatalogueSync();
      console.log(`[NetSuite] Product sync: ${r.processed} processed, ${r.errors} errors`);
    } catch (err) {
      console.error("[NetSuite] Product sync failed:", err);
    }
  });
}
