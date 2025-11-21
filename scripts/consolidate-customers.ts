import { db } from '../server/db';
import { customers, customerContacts, interactions, customerBrands, actionItems, customerMonthlyTargets, monthlySalesTracking } from '../shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';

async function consolidateCustomers() {
  try {
    console.log('🔍 Finding duplicate customers...\n');
    
    // Find all duplicate customer names
    const duplicates = await db.execute(sql`
      SELECT name, COUNT(*) as count, ARRAY_AGG(id ORDER BY created_at) as customer_ids
      FROM customers 
      GROUP BY name 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicate customers found!');
      return;
    }
    
    console.log(`Found ${duplicates.rows.length} groups of duplicates:\n`);
    
    for (const row of duplicates.rows) {
      const companyName = row.name as string;
      const count = row.count as number;
      const customerIds = row.customer_ids as string[];
      
      console.log(`\n📋 ${companyName} (${count} duplicates)`);
      console.log(`   Customer IDs: ${customerIds.join(', ')}`);
      
      // Get all customer records for this company
      const customerRecords = await db.select()
        .from(customers)
        .where(inArray(customers.id, customerIds))
        .orderBy(customers.createdAt);
      
      // First customer is the master
      const masterCustomer = customerRecords[0];
      const duplicateCustomers = customerRecords.slice(1);
      
      console.log(`   ✓ Master: ${masterCustomer.id} (${masterCustomer.contactName || 'No contact'})`);
      console.log(`   → Merging ${duplicateCustomers.length} duplicate(s)...`);
      
      // Migrate each duplicate
      for (const duplicate of duplicateCustomers) {
        console.log(`\n   Processing duplicate: ${duplicate.id} (${duplicate.contactName || 'No contact'})`);
        
        // 1. Create customer contact entry if duplicate has contact info
        if (duplicate.contactName || duplicate.contactEmail || duplicate.contactPhone) {
          await db.insert(customerContacts).values({
            customerId: masterCustomer.id,
            name: duplicate.contactName || '',
            title: duplicate.contactTitle || '',
            email: duplicate.contactEmail || '',
            phone: duplicate.contactPhone || '',
          });
          console.log(`      ✓ Migrated contact: ${duplicate.contactName}`);
        }
        
        // 2. Migrate interactions
        const interactionsToMigrate = await db.select()
          .from(interactions)
          .where(eq(interactions.customerId, duplicate.id));
        
        if (interactionsToMigrate.length > 0) {
          await db.update(interactions)
            .set({ customerId: masterCustomer.id })
            .where(eq(interactions.customerId, duplicate.id));
          console.log(`      ✓ Migrated ${interactionsToMigrate.length} interaction(s)`);
        }
        
        // 3. Migrate customer brands (check for duplicates first)
        const duplicateBrands = await db.select()
          .from(customerBrands)
          .where(eq(customerBrands.customerId, duplicate.id));
        
        const masterBrands = await db.select()
          .from(customerBrands)
          .where(eq(customerBrands.customerId, masterCustomer.id));
        
        const masterBrandIds = new Set(masterBrands.map(b => b.brandId));
        
        for (const brand of duplicateBrands) {
          if (!masterBrandIds.has(brand.brandId)) {
            await db.update(customerBrands)
              .set({ customerId: masterCustomer.id })
              .where(eq(customerBrands.id, brand.id));
          } else {
            // Delete duplicate brand assignment
            await db.delete(customerBrands)
              .where(eq(customerBrands.id, brand.id));
          }
        }
        
        if (duplicateBrands.length > 0) {
          console.log(`      ✓ Migrated ${duplicateBrands.length} brand assignment(s)`);
        }
        
        // 4. Migrate action items
        const actionItemsToMigrate = await db.select()
          .from(actionItems)
          .where(eq(actionItems.customerId, duplicate.id));
        
        if (actionItemsToMigrate.length > 0) {
          await db.update(actionItems)
            .set({ customerId: masterCustomer.id })
            .where(eq(actionItems.customerId, duplicate.id));
          console.log(`      ✓ Migrated ${actionItemsToMigrate.length} action item(s)`);
        }
        
        // 5. Migrate customer monthly targets
        const monthlyTargetsToMigrate = await db.select()
          .from(customerMonthlyTargets)
          .where(eq(customerMonthlyTargets.customerId, duplicate.id));
        
        if (monthlyTargetsToMigrate.length > 0) {
          await db.update(customerMonthlyTargets)
            .set({ customerId: masterCustomer.id })
            .where(eq(customerMonthlyTargets.customerId, duplicate.id));
          console.log(`      ✓ Migrated ${monthlyTargetsToMigrate.length} customer monthly target(s)`);
        }
        
        // 6. Migrate monthly sales tracking
        const salesToMigrate = await db.select()
          .from(monthlySalesTracking)
          .where(eq(monthlySalesTracking.customerId, duplicate.id));
        
        if (salesToMigrate.length > 0) {
          await db.update(monthlySalesTracking)
            .set({ customerId: masterCustomer.id })
            .where(eq(monthlySalesTracking.customerId, duplicate.id));
          console.log(`      ✓ Migrated ${salesToMigrate.length} sales record(s)`);
        }
        
        // 7. Delete the duplicate customer
        await db.delete(customers)
          .where(eq(customers.id, duplicate.id));
        console.log(`      ✓ Deleted duplicate customer record`);
      }
      
      console.log(`   ✅ Consolidated ${companyName}!`);
    }
    
    console.log('\n\n✅ Consolidation complete!\n');
    
    // Show summary
    console.log('📊 Summary:');
    const afterCount = await db.execute(sql`
      SELECT name, COUNT(*) as count
      FROM customers 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    
    if (afterCount.rows.length === 0) {
      console.log('   ✓ All duplicates resolved!');
    } else {
      console.log(`   ⚠ Still ${afterCount.rows.length} duplicate group(s) remaining`);
    }
    
    // Show contacts created
    const contactCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM customer_contacts
    `);
    console.log(`   ✓ Total additional contacts: ${contactCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error consolidating customers:', error);
  }
  
  process.exit(0);
}

consolidateCustomers();
