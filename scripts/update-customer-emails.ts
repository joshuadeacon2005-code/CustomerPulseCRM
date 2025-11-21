import XLSX from 'xlsx';
import { db } from '../server/db';
import { customers, customerContacts } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function updateCustomerEmails() {
  try {
    console.log('📧 Reading customer emails from Excel...\n');
    
    const workbook = XLSX.readFile('attached_assets/customer_import_template (1) (1)_1763640854100.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    // Skip header row
    const rows = data.slice(1);
    
    console.log(`Found ${rows.length} rows in Excel\n`);
    
    let mainContactsUpdated = 0;
    let additionalContactsUpdated = 0;
    let notFound = 0;
    
    for (const row of rows) {
      const companyName = row[0]; // Column A
      const email = row[1]; // Column B
      const contactName = row[14]; // Column O - Contact Name
      
      if (!companyName || !contactName || !email) {
        continue;
      }
      
      // Find the customer by company name
      const [customer] = await db.select()
        .from(customers)
        .where(eq(customers.name, companyName));
      
      if (!customer) {
        console.log(`⚠ Customer not found: ${companyName}`);
        notFound++;
        continue;
      }
      
      // Check if this contact is the main contact
      if (customer.contactName === contactName) {
        // Update main contact email
        await db.update(customers)
          .set({ contactEmail: email })
          .where(eq(customers.id, customer.id));
        
        console.log(`✓ Updated main contact: ${companyName} - ${contactName} (${email})`);
        mainContactsUpdated++;
      } else {
        // Check if this is an additional contact
        const [additionalContact] = await db.select()
          .from(customerContacts)
          .where(
            and(
              eq(customerContacts.customerId, customer.id),
              eq(customerContacts.name, contactName)
            )
          );
        
        if (additionalContact) {
          await db.update(customerContacts)
            .set({ email: email })
            .where(eq(customerContacts.id, additionalContact.id));
          
          console.log(`✓ Updated additional contact: ${companyName} - ${contactName} (${email})`);
          additionalContactsUpdated++;
        } else {
          console.log(`⚠ Contact not found: ${companyName} - ${contactName}`);
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✓ Main contacts updated: ${mainContactsUpdated}`);
    console.log(`   ✓ Additional contacts updated: ${additionalContactsUpdated}`);
    console.log(`   ⚠ Not found: ${notFound}`);
    console.log('\n✅ Email update complete!');
    
  } catch (error) {
    console.error('❌ Error updating emails:', error);
  }
  
  process.exit(0);
}

updateCustomerEmails();
