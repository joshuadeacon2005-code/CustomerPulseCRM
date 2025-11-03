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

async function addEllenAndUpdate() {
  try {
    console.log('Adding Ellen to the system...');
    
    // Get Alex CEO's ID for Ellen's manager
    const [alexCEO] = await db.select().from(users).where(eq(users.username, 'alexceo'));
    
    if (!alexCEO) {
      console.error('Alex CEO not found!');
      process.exit(1);
    }
    
    const hashedPassword = await hashPassword('Ellen');
    
    // Add Ellen as a regional manager for China region
    const [ellen] = await db.insert(users).values({
      username: 'ellen',
      password: hashedPassword,
      name: 'Ellen',
      role: 'regional_manager',
      country: 'CN',
      regionalOffice: 'Shanghai',
      managerId: alexCEO.id
    }).returning();
    
    console.log('✓ Created user: Ellen (username: ellen, password: Ellen)');
    console.log(`  Role: Regional Manager, Office: Shanghai, Reports to: ${alexCEO.name}`);
    
    // Update users who report to Ellen
    const usersReportingToEllen = ['lily', 'megan.li', 'sissi.li', 'laura'];
    
    console.log('\nUpdating users to report to Ellen...');
    
    for (const username of usersReportingToEllen) {
      await db.update(users).set({ managerId: ellen.id }).where(eq(users.username, username));
      const [user] = await db.select().from(users).where(eq(users.username, username));
      if (user) {
        console.log(`✓ ${user.name} now reports to Ellen`);
      }
    }
    
    // Update Hollie Gale's regional office to Australia/NZ
    console.log('\nUpdating Hollie Gale regional office...');
    await db.update(users)
      .set({ regionalOffice: 'Australia/NZ' })
      .where(eq(users.username, 'hollie'));
    
    console.log('✓ Hollie Gale regional office updated to Australia/NZ');
    
    console.log('\n✅ All updates complete!');
    
  } catch (error: any) {
    if (error.code === '23505') {
      console.log('⚠ Ellen already exists in the system');
    } else {
      console.error('Error:', error);
    }
  }
  
  process.exit(0);
}

addEllenAndUpdate();
