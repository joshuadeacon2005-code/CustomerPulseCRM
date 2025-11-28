import { Pool } from '@neondatabase/serverless';
import fs from 'fs';

async function importSingaporeCustomers() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const customers = JSON.parse(fs.readFileSync('/tmp/singapore_customers.json', 'utf8'));
    console.log(`Processing ${customers.length} Singapore customers...`);
    
    const scottResult = await pool.query(
      "SELECT id FROM users WHERE username = 'scott.ang'"
    );
    if (scottResult.rows.length === 0) {
      throw new Error('Scott user not found');
    }
    const scottId = scottResult.rows[0].id;
    console.log(`Assigning customers to Scott (ID: ${scottId})`);
    
    const brandsResult = await pool.query("SELECT id, name FROM brands");
    const brandMap = {};
    brandsResult.rows.forEach(b => {
      brandMap[b.name.toLowerCase().trim()] = b.id;
    });
    console.log(`Found ${Object.keys(brandMap).length} existing brands`);
    
    const existingResult = await pool.query(
      "SELECT LOWER(name) as name, LOWER(contact_email) as email FROM customers WHERE country = 'Singapore'"
    );
    const existingNames = new Set(existingResult.rows.map(r => r.name));
    const existingEmails = new Set(existingResult.rows.filter(r => r.email).map(r => r.email));
    console.log(`Found ${existingNames.size} existing Singapore customers`);
    
    let imported = 0;
    let skipped = 0;
    let errors = [];
    
    for (const cust of customers) {
      try {
        const nameLC = cust.name.toLowerCase().trim();
        const emailLC = (cust.email || '').toLowerCase().trim();
        
        if (existingNames.has(nameLC)) {
          skipped++;
          console.log(`SKIP (duplicate name): ${cust.name}`);
          continue;
        }
        if (emailLC && existingEmails.has(emailLC)) {
          skipped++;
          console.log(`SKIP (duplicate email): ${cust.name} - ${cust.email}`);
          continue;
        }
        
        const idResult = await pool.query("SELECT gen_random_uuid() as id");
        const customerId = idResult.rows[0].id;
        
        const retailerTypeMap = {
          'baby & nursery independent/boutique': 'baby_nursery_independent',
          'online only': 'online_only',
          'corporate': 'corporate',
          'department store': 'department_store',
          'pharmacy': 'pharmacy',
          'supermarket': 'supermarket',
          'department store - chain': 'department_store',
          'baby chain': 'baby_chain',
          'gift shop': 'gift_shop',
          'distributor': 'distributor',
          'marketplace': 'marketplace',
          'toy store': 'toy_store',
          'lifestyle store': 'lifestyle_store'
        };
        const retailerType = retailerTypeMap[(cust.retailerType || '').toLowerCase()] || null;
        
        await pool.query(
          `INSERT INTO customers (
            id, name, contact_email, contact_phone, country, stage, 
            contact_name, contact_title, address, assigned_to,
            date_of_first_contact, retailer_type, currency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            customerId,
            cust.name,
            cust.email || null,
            cust.phone || null,
            'Singapore',
            cust.stage || 'customer',
            cust.contactName || null,
            cust.contactTitle || null,
            cust.address || null,
            scottId,
            cust.dateOfFirstContact || null,
            retailerType,
            'SGD'
          ]
        );
        
        if (cust.brands) {
          const brandNames = cust.brands.split(',').map(b => b.trim()).filter(b => b);
          for (const brandName of brandNames) {
            let brandId = brandMap[brandName.toLowerCase()];
            
            if (!brandId) {
              const newBrandResult = await pool.query(
                "INSERT INTO brands (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
                [brandName]
              );
              brandId = newBrandResult.rows[0].id;
              brandMap[brandName.toLowerCase()] = brandId;
              console.log(`  Created new brand: ${brandName}`);
            }
            
            await pool.query(
              "INSERT INTO customer_brands (customer_id, brand_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [customerId, brandId]
            );
          }
        }
        
        imported++;
        existingNames.add(nameLC);
        if (emailLC) existingEmails.add(emailLC);
        
      } catch (err) {
        errors.push({ name: cust.name, error: err.message });
        console.error(`ERROR: ${cust.name} - ${err.message}`);
      }
    }
    
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total processed: ${customers.length}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importSingaporeCustomers();
