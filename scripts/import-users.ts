import XLSX from 'xlsx';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function mapJobTitleToRole(jobTitle: string): 'ceo' | 'sales_director' | 'regional_manager' | 'manager' | 'salesman' {
  const title = jobTitle.toLowerCase();
  
  if (title.includes('ceo')) return 'ceo';
  if (title.includes('sales director') || title.includes('director')) return 'sales_director';
  if (title.includes('regional manager')) return 'regional_manager';
  if (title.includes('manager') || title.includes('administration')) return 'manager';
  
  return 'salesman';
}

function mapRegionToOffice(region: string): string | null {
  const regionMap: Record<string, string> = {
    'AU': 'Australia/NZ',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'CN': 'Shanghai',
    'ID': 'Indonesia',
    'MY': 'Malaysia',
    'GZ': 'Guangzhou'
  };
  
  return regionMap[region] || null;
}

async function importUsersFromExcel() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('attached_assets/B&G Group Sales Teams (no merchandiser) - Oct 2025_1762135037230.xlsx');
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} rows in Excel file`);
    
    // Skip the header row (first row)
    const userData = data.slice(1) as any[];
    
    console.log(`Processing ${userData.length} users...\n`);
    
    // First pass: create all users without manager relationships
    const createdUsers: Map<string, string> = new Map(); // name -> userId
    const userManagerMapping: Map<string, string> = new Map(); // userId -> managerName
    
    for (const row of userData) {
      const region = row['B&G Group Sales Teams (no merchandiser)'];
      const name = row['__EMPTY'];
      const jobTitle = row['__EMPTY_1'];
      const email = row['__EMPTY_3'];
      const managerName = row['10/31/25'];
      
      if (!name || !email) {
        console.log(`Skipping row: missing name or email`);
        continue;
      }
      
      const role = mapJobTitleToRole(jobTitle);
      const regionalOffice = mapRegionToOffice(region);
      const username = email.split('@')[0]; // Use email prefix as username
      const hashedPassword = await hashPassword(name); // Use name as password
      
      try {
        const [user] = await db.insert(users).values({
          username,
          password: hashedPassword,
          name,
          role,
          country: region || 'AU',
          regionalOffice,
          managerId: null // Will update in second pass
        }).returning();
        
        createdUsers.set(name, user.id);
        if (managerName && managerName !== name) {
          userManagerMapping.set(user.id, managerName);
        }
        
        console.log(`✓ Created user: ${name} (${email}) - Role: ${role}, Office: ${regionalOffice}`);
      } catch (error: any) {
        if (error.code === '23505') { // Duplicate key error
          console.log(`⚠ User ${name} (${email}) already exists, skipping...`);
        } else {
          console.error(`✗ Error creating user ${name}:`, error.message);
        }
      }
    }
    
    // Second pass: update manager relationships
    console.log(`\nUpdating manager relationships...`);
    for (const [userId, managerName] of userManagerMapping.entries()) {
      const managerId = createdUsers.get(managerName);
      if (managerId) {
        await db.update(users).set({ managerId }).where(eq(users.id, userId));
        console.log(`✓ Updated manager for user ID ${userId} -> ${managerName}`);
      } else {
        console.log(`⚠ Manager "${managerName}" not found for user ID ${userId}`);
      }
    }
    
    console.log(`\n✅ Import complete! Created ${createdUsers.size} users.`);
    
  } catch (error) {
    console.error('Error importing users:', error);
  }
  
  process.exit(0);
}

importUsersFromExcel();
