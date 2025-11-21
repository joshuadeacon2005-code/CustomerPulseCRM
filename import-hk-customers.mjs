import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5000';

async function importCustomers() {
  try {
    // Login first - using admin/admin credentials
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });

    const cookies = loginRes.headers.get('set-cookie');
    
    if (!cookies) {
      console.error('Login failed - no session cookie');
      return;
    }

    // Read the Excel file
    const filePath = './attached_assets/customer master fo Hong Kong_1763711163542.xlsx';
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Prepare form data with Excel file
    const form = new FormData();
    form.append('file', blob, path.basename(filePath));

    // Import customers
    const importRes = await fetch(`${API_URL}/api/customers/import`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      body: form
    });

    const result = await importRes.json();
    
    console.log('\n=== IMPORT RESULTS ===');
    console.log('Status:', importRes.status);
    console.log('Success:', result.success);
    console.log('Summary:');
    console.log('  Total:', result.summary?.total);
    console.log('  Successful:', result.summary?.successful);
    console.log('  Failed:', result.summary?.failed);
    console.log('  Skipped:', result.summary?.skipped);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors (first 10):');
      result.errors.slice(0, 10).forEach(err => {
        console.log(`  Row ${err.row} (${err.companyName}): ${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }
    
    console.log('\n=== END ===\n');
  } catch (error) {
    console.error('Import failed:', error.message);
  }
}

importCustomers();
