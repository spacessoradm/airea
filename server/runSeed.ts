import { seedProperties } from "./seedData";

async function main() {
  try {
    await seedProperties();
    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

main();