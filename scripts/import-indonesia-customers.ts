import XLSX from 'xlsx';
import { db } from '../server/db';
import { customers, customerContacts, customerAddresses, brands, customerBrands, users } from '../shared/schema';
import { eq, and, ilike } from 'drizzle-orm';

interface ExcelRow {
  companyName: string;
  email?: string;
  phone?: string;
  storeAddress?: string;
  country?: string;
  retailerType?: string;
  registeredWithBC?: string;
  ordersViaBC?: string;
  firstOrderDate?: string;
  quarterlySoftTarget?: number;
  leadGeneratedBy?: string;
  dateOfFirstContact?: string;
  lastContactDate?: string;
  stage?: string;
  contactName?: string;
  contactTitle?: string;
  contactPhone?: string;
  contactEmail?: string;
  personalNotes?: string;
  brands?: string;
}

const COLUMN_MAP: Record<number, keyof ExcelRow> = {
  0: 'companyName',
  1: 'email',
  2: 'phone',
  3: 'storeAddress',
  4: 'country',
  5: 'retailerType',
  6: 'registeredWithBC',
  7: 'ordersViaBC',
  8: 'firstOrderDate',
  9: 'quarterlySoftTarget',
  10: 'leadGeneratedBy',
  11: 'dateOfFirstContact',
  12: 'lastContactDate',
  13: 'stage',
  14: 'contactName',
  15: 'contactTitle',
  16: 'contactPhone',
  17: 'contactEmail',
  18: 'personalNotes',
  19: 'brands',
};

function parseRow(row: any[]): ExcelRow {
  const result: Partial<ExcelRow> = {};
  row.forEach((val, idx) => {
    const key = COLUMN_MAP[idx];
    if (key && val !== undefined && val !== null && val !== '') {
      result[key] = val;
    }
  });
  return result as ExcelRow;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + val * 86400000);
  }
  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function mapStage(stage?: string): 'lead' | 'prospect' | 'customer' {
  if (!stage) return 'lead';
  const s = stage.toLowerCase();
  if (s.includes('customer')) return 'customer';
  if (s.includes('prospect')) return 'prospect';
  return 'lead';
}

function cleanPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^'+/, '').trim();
}

async function findOrCreateBrand(brandName: string): Promise<string | null> {
  const trimmed = brandName.trim();
  if (!trimmed) return null;
  
  const existing = await db.select().from(brands).where(ilike(brands.name, trimmed));
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  const [newBrand] = await db.insert(brands).values({ name: trimmed }).returning();
  console.log(`  Created new brand: ${trimmed}`);
  return newBrand.id;
}

async function getDefaultAssignee(): Promise<string> {
  const indonesiaUsers = await db.select().from(users)
    .where(eq(users.regionalOffice, 'Indonesia'));
  
  if (indonesiaUsers.length > 0) {
    return indonesiaUsers[0].id;
  }
  
  const allUsers = await db.select().from(users);
  if (allUsers.length > 0) {
    return allUsers[0].id;
  }
  
  throw new Error('No users found in database');
}

async function main() {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile('attached_assets/customer ind_1764134273410.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  const headers = rawData[0];
  const dataRows = rawData.slice(1).filter(row => row[0]);
  
  console.log(`Found ${dataRows.length} data rows`);
  
  const groupedByCompany = new Map<string, ExcelRow[]>();
  for (const row of dataRows) {
    const parsed = parseRow(row);
    if (!parsed.companyName) continue;
    
    const existing = groupedByCompany.get(parsed.companyName) || [];
    existing.push(parsed);
    groupedByCompany.set(parsed.companyName, existing);
  }
  
  console.log(`Found ${groupedByCompany.size} unique companies`);
  const multiContact = Array.from(groupedByCompany.entries()).filter(([_, rows]) => rows.length > 1);
  console.log(`Companies with multiple contacts: ${multiContact.length}`);
  
  const defaultAssignee = await getDefaultAssignee();
  console.log(`Default assignee ID: ${defaultAssignee}`);
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let contactsAdded = 0;
  let addressesAdded = 0;
  
  for (const [companyName, rows] of groupedByCompany) {
    const primaryRow = rows[0];
    
    const existingCustomers = await db.select().from(customers)
      .where(ilike(customers.name, companyName));
    
    let customerId: string;
    
    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
      console.log(`Customer already exists: ${companyName} (ID: ${customerId})`);
      updated++;
    } else {
      const [newCustomer] = await db.insert(customers).values({
        name: companyName,
        email: primaryRow.email,
        phone: cleanPhone(primaryRow.phone),
        storeAddress: primaryRow.storeAddress,
        country: 'Indonesia',
        retailerType: primaryRow.retailerType,
        registeredWithBC: primaryRow.registeredWithBC?.toLowerCase() === 'yes',
        ordersViaBC: primaryRow.ordersViaBC?.toLowerCase() === 'yes',
        firstOrderDate: parseDate(primaryRow.firstOrderDate),
        quarterlySoftTarget: primaryRow.quarterlySoftTarget?.toString(),
        quarterlySoftTargetCurrency: 'USD',
        leadSource: primaryRow.leadGeneratedBy || undefined,
        dateOfFirstContact: parseDate(primaryRow.dateOfFirstContact),
        lastContactDate: parseDate(primaryRow.lastContactDate),
        stage: mapStage(primaryRow.stage),
        contactName: primaryRow.contactName,
        contactTitle: primaryRow.contactTitle,
        contactPhone: cleanPhone(primaryRow.contactPhone),
        contactEmail: primaryRow.contactEmail,
        personalNotes: primaryRow.personalNotes,
        assignedTo: defaultAssignee,
        currency: 'IDR',
        baseCurrencyAmount: null,
      }).returning();
      
      customerId = newCustomer.id;
      console.log(`Created customer: ${companyName} (ID: ${customerId})`);
      created++;
    }
    
    const existingContacts = await db.select().from(customerContacts)
      .where(eq(customerContacts.customerId, customerId));
    const existingContactNames = new Set(existingContacts.map(c => c.name?.toLowerCase()));
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.contactName && !existingContactNames.has(row.contactName.toLowerCase())) {
        await db.insert(customerContacts).values({
          customerId,
          name: row.contactName,
          title: row.contactTitle,
          phone: cleanPhone(row.contactPhone),
          email: row.contactEmail,
        });
        existingContactNames.add(row.contactName.toLowerCase());
        contactsAdded++;
        console.log(`  Added contact: ${row.contactName} for ${companyName}`);
      }
    }
    
    const existingAddresses = await db.select().from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId));
    const existingAddressTexts = new Set(existingAddresses.map(a => a.address?.toLowerCase()));
    
    for (const row of rows) {
      if (row.storeAddress && !existingAddressTexts.has(row.storeAddress.toLowerCase())) {
        await db.insert(customerAddresses).values({
          customerId,
          addressType: 'store',
          address: row.storeAddress,
          country: 'Indonesia',
        });
        existingAddressTexts.add(row.storeAddress.toLowerCase());
        addressesAdded++;
        console.log(`  Added address for ${companyName}`);
      }
    }
    
    if (primaryRow.brands) {
      const brandNames = primaryRow.brands.split(',').map(b => b.trim()).filter(b => b);
      const existingBrandLinks = await db.select().from(customerBrands)
        .where(eq(customerBrands.customerId, customerId));
      const existingBrandIds = new Set(existingBrandLinks.map(b => b.brandId));
      
      for (const brandName of brandNames) {
        const normalizedName = brandName.replace(/\s+/g, ' ').trim();
        const brandId = await findOrCreateBrand(normalizedName);
        if (brandId && !existingBrandIds.has(brandId)) {
          await db.insert(customerBrands).values({
            customerId,
            brandId,
          });
          existingBrandIds.add(brandId);
          console.log(`  Linked brand: ${normalizedName} to ${companyName}`);
        }
      }
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Created: ${created} customers`);
  console.log(`Updated/Skipped: ${updated} existing customers`);
  console.log(`Additional contacts added: ${contactsAdded}`);
  console.log(`Additional addresses added: ${addressesAdded}`);
  console.log('Import complete!');
}

main().catch(console.error).finally(() => process.exit(0));
