import { storage } from "./storage";

// The 17 brands in alphabetical order
const BRANDS = [
  "Beaba",
  "Bheue Matchstick Monkey",
  "Bubble",
  "Childhome",
  "Cogni Kids",
  "Dew",
  "Done By Deer",
  "Ergobaby",
  "Etta Loves",
  "Koala Eco",
  "Le Toy Van",
  "Pearhead",
  "Skip Hop",
  "Snuggle Me",
  "Suavinex",
  "Trunki",
  "Ubbi",
];

async function seedBrands() {
  console.log("Starting brand seed...");
  
  try {
    const existingBrands = await storage.getBrands();
    const existingBrandNames = new Set(existingBrands.map(b => b.name));
    
    let created = 0;
    let skipped = 0;
    
    for (const brandName of BRANDS) {
      if (existingBrandNames.has(brandName)) {
        console.log(`  ⏭️  Skipping "${brandName}" - already exists`);
        skipped++;
      } else {
        await storage.createBrand({ name: brandName });
        console.log(`  ✓ Created "${brandName}"`);
        created++;
      }
    }
    
    console.log(`\n✅ Brand seed complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${BRANDS.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding brands:", error);
    process.exit(1);
  }
}

seedBrands();
