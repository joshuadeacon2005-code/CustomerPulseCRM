import fs from 'fs';

const API_URL = 'http://localhost:5000';

async function testImport() {
  try {
    // Login
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });

    const cookies = loginRes.headers.get('set-cookie');
    
    // Import
    const filePath = './attached_assets/customer master fo Hong Kong_1763711163542.xlsx';
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const form = new FormData();
    form.append('file', blob, 'customers.xlsx');

    const importRes = await fetch(`${API_URL}/api/customers/import`, {
      method: 'POST',
      headers: { 'Cookie': cookies },
      body: form
    });

    const result = await importRes.json();
    
    console.log('Status:', importRes.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // Show first few errors
    if (result.errors && result.errors.length > 0) {
      console.log('\nFirst 5 errors:');
      result.errors.slice(0, 5).forEach(err => {
        console.log(`Row ${err.row} - ${err.companyName}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testImport();
