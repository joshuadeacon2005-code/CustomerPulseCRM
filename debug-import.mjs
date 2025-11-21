import XLSX from 'xlsx';
import fs from 'fs';

const filePath = './attached_assets/customer master fo Hong Kong_1763711163542.xlsx';

// Read the Excel file
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

console.log('Excel file structure:');
console.log('Total rows:', data.length);
console.log('\nColumn headers (first row):');
console.log(data[0]);
console.log('\nFirst data row (row 2):');
console.log(data[1]);
console.log('\nSample row values:');
if (data[1]) {
  data[0].forEach((header, i) => {
    console.log(`  ${header}: "${data[1][i]}"`);
  });
}
console.log('\nRows with Company Name:');
let count = 0;
for (let i = 1; i < Math.min(10, data.length); i++) {
  const row = data[i];
  const companyNameIndex = data[0].indexOf('Company Name');
  if (companyNameIndex !== -1 && row[companyNameIndex]) {
    console.log(`  Row ${i + 1}: ${row[companyNameIndex]}`);
    count++;
  }
}
console.log(`\nTotal non-empty rows found: ${count}`);
