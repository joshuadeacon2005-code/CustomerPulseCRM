import XLSX from 'xlsx';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updateManagerRelationships() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('attached_assets/B&G Group Sales Teams (no merchandiser) - Oct 2025_1762135037230.xlsx');
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Skip the header row
    const userData = data.slice(1) as any[];
    
    console.log('Loading existing users from database...');
    const allUsers = await db.select().from(users);
    
    // Create maps for quick lookup
    const usersByName = new Map(allUsers.map(u => [u.name, u.id]));
    const usersByEmail = new Map(allUsers.map(u => [u.username, u.id]));
    
    // Helper function to find manager by partial name match
    function findManagerId(managerName: string): string | null {
      // First try exact match
      const exactMatch = usersByName.get(managerName);
      if (exactMatch) return exactMatch;
      
      // Try partial match (manager name is contained in user name)
      const normalizedManagerName = managerName.toLowerCase();
      for (const [userName, userId] of usersByName.entries()) {
        if (userName.toLowerCase().includes(normalizedManagerName) || 
            normalizedManagerName.includes(userName.toLowerCase())) {
          return userId;
        }
      }
      
      return null;
    }
    
    console.log(`Found ${allUsers.length} existing users in database\n`);
    console.log('Updating manager relationships...\n');
    
    let updated = 0;
    let notFound = 0;
    
    for (const row of userData) {
      const name = row['__EMPTY'];
      const email = row['__EMPTY_3'];
      const managerName = row['10/31/25'];
      
      if (!name || !email || !managerName || managerName === name) {
        continue;
      }
      
      const username = email.split('@')[0];
      const userId = usersByEmail.get(username);
      
      if (!userId) {
        console.log(`⚠ User not found: ${name} (${email})`);
        notFound++;
        continue;
      }
      
      const managerId = findManagerId(managerName);
      
      if (!managerId) {
        console.log(`⚠ Manager "${managerName}" not found for ${name}`);
        notFound++;
        continue;
      }
      
      await db.update(users).set({ managerId }).where(eq(users.id, userId));
      console.log(`✓ ${name} -> reports to -> ${managerName}`);
      updated++;
    }
    
    console.log(`\n✅ Updated ${updated} manager relationships`);
    if (notFound > 0) {
      console.log(`⚠ ${notFound} relationships could not be updated (users or managers not found)`);
    }
    
  } catch (error) {
    console.error('Error updating manager relationships:', error);
  }
  
  process.exit(0);
}

updateManagerRelationships();
