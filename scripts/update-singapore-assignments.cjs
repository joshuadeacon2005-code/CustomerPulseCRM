const XLSX = require('xlsx');
const { Pool } = require('@neondatabase/serverless');

// Sales rep name mapping from Excel to database user IDs
const SALES_REP_MAPPING = {
  'SCOTT ANG': '527da0a0-2b9a-47c8-92d5-a66be7a34c9c',      // Scott Ang
  'Jeremy Low Yong Cheng': 'e0f21ef5-7e1c-4643-9f0a-f503fe22653a', // Jeremy Low
  'Sharwind Saravanan': 'f65d32aa-bab8-4db5-88e1-e324d61e8582',    // Sharwind Sarawanan
};

// Sales reps that couldn't be mapped (look like customer/category names)
const UNCLEAR_SALES_REPS = ['Amazon (SG)', 'Baby Central Singapore', 'SG E-commerce'];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile('attached_assets/Singapore_Customers_28th_Nov_2025_updated_1767768817926.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`\n=== Singapore Customer Assignment Update ===\n`);
    console.log(`Total rows in Excel: ${excelData.length}\n`);
    
    // Get all Singapore customers from database
    const dbResult = await pool.query(
      `SELECT id, name, "assignedTo" FROM customers WHERE country = 'Singapore'`
    );
    const dbCustomers = dbResult.rows;
    console.log(`Total Singapore customers in database: ${dbCustomers.length}\n`);
    
    // Create a map for faster lookup (lowercase name -> customer)
    const dbCustomerMap = new Map();
    dbCustomers.forEach(c => {
      dbCustomerMap.set(c.name.toLowerCase().trim(), c);
    });
    
    // Track results
    const results = {
      updated: [],
      notFoundInDb: [],
      unclearSalesRep: [],
      alreadyAssigned: [],
      noSalesRep: []
    };
    
    // Process each Excel row
    for (const row of excelData) {
      const customerName = row['Name']?.trim();
      const salesRep = row['Sales Rep']?.trim();
      
      if (!customerName) continue;
      
      // Find customer in database
      const dbCustomer = dbCustomerMap.get(customerName.toLowerCase());
      
      if (!dbCustomer) {
        results.notFoundInDb.push({ name: customerName, salesRep });
        continue;
      }
      
      if (!salesRep) {
        results.noSalesRep.push({ name: customerName });
        continue;
      }
      
      // Check if sales rep is in unclear list
      if (UNCLEAR_SALES_REPS.includes(salesRep)) {
        results.unclearSalesRep.push({ name: customerName, salesRep });
        continue;
      }
      
      // Get user ID from mapping
      const userId = SALES_REP_MAPPING[salesRep];
      
      if (!userId) {
        results.unclearSalesRep.push({ name: customerName, salesRep, reason: 'No mapping found' });
        continue;
      }
      
      // Check if already assigned to this user
      if (dbCustomer.assignedTo === userId) {
        results.alreadyAssigned.push({ name: customerName, salesRep });
        continue;
      }
      
      // Update the customer
      await pool.query(
        `UPDATE customers SET "assignedTo" = $1 WHERE id = $2`,
        [userId, dbCustomer.id]
      );
      
      results.updated.push({ 
        name: customerName, 
        salesRep, 
        previousAssignment: dbCustomer.assignedTo || 'None'
      });
    }
    
    // Print report
    console.log(`\n=== RESULTS ===\n`);
    
    console.log(`✅ UPDATED (${results.updated.length}):`);
    results.updated.forEach(r => {
      console.log(`   - ${r.name} → ${r.salesRep} (was: ${r.previousAssignment})`);
    });
    
    console.log(`\n⚠️  UNCLEAR SALES REP - NEEDS CLARIFICATION (${results.unclearSalesRep.length}):`);
    results.unclearSalesRep.forEach(r => {
      console.log(`   - ${r.name} → "${r.salesRep}" ${r.reason ? `(${r.reason})` : ''}`);
    });
    
    console.log(`\n❌ NOT FOUND IN DATABASE (${results.notFoundInDb.length}):`);
    results.notFoundInDb.forEach(r => {
      console.log(`   - ${r.name} (Sales Rep: ${r.salesRep || 'None'})`);
    });
    
    console.log(`\n📋 ALREADY CORRECTLY ASSIGNED (${results.alreadyAssigned.length}):`);
    results.alreadyAssigned.forEach(r => {
      console.log(`   - ${r.name} → ${r.salesRep}`);
    });
    
    console.log(`\n📝 NO SALES REP IN EXCEL (${results.noSalesRep.length}):`);
    results.noSalesRep.forEach(r => {
      console.log(`   - ${r.name}`);
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Updated: ${results.updated.length}`);
    console.log(`Already assigned: ${results.alreadyAssigned.length}`);
    console.log(`Unclear sales rep (needs clarification): ${results.unclearSalesRep.length}`);
    console.log(`Not found in database: ${results.notFoundInDb.length}`);
    console.log(`No sales rep in Excel: ${results.noSalesRep.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
