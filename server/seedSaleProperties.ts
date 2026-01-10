#!/usr/bin/env tsx

import { seedSaleProperties } from "./seedData";

async function main() {
  try {
    console.log("Starting sale properties seeding...");
    const result = await seedSaleProperties();
    console.log("Seeding completed successfully!", result);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

main();