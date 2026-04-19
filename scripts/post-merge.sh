#!/bin/bash
set -e
npm install

# Rename auto-named unique constraints (_key suffix) to the names drizzle-kit expects
# (_unique suffix), preventing interactive TTY prompts during db:push.
# Each rename is idempotent — safe to run multiple times.
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const renames = [
  ['offices',           'offices_name_key',                 'offices_name_unique'],
  ['offices',           'offices_code_key',                 'offices_code_unique'],
  ['oauth_states',      'oauth_states_state_key',           'oauth_states_state_unique'],
  ['netsuite_orders',   'netsuite_orders_ns_order_id_key',  'netsuite_orders_ns_order_id_unique'],
  ['netsuite_products', 'netsuite_products_ns_item_id_key', 'netsuite_products_ns_item_id_unique'],
];

client.connect().then(async () => {
  for (const [table, oldName, newName] of renames) {
    try {
      await client.query(\`
        DO \$\$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '\${oldName}' AND conrelid = '\${table}'::regclass
          ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '\${newName}' AND conrelid = '\${table}'::regclass
          ) THEN
            ALTER TABLE \${table} RENAME CONSTRAINT \"\${oldName}\" TO \"\${newName}\";
          END IF;
        END
        \$\$;
      \`);
    } catch (e) {
      // Table may not exist yet — that is fine, drizzle will create it
    }
  }
  console.log('Pre-migration DDL applied.');
  await client.end();
}).catch(err => { console.error(err); process.exit(1); });
"

# Write a temporary drizzle config that excludes the 'session' table.
# The session table is managed by connect-pg-simple and is NOT in the Drizzle
# schema — without filtering it out, drizzle-kit prompts to drop it interactively.
cat > drizzle.push.config.ts << 'DRIZZLE_CFG'
import { defineConfig } from "drizzle-kit";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
  tablesFilter: ["!session"],
});
DRIZZLE_CFG

npx drizzle-kit push --config=drizzle.push.config.ts
rm -f drizzle.push.config.ts
