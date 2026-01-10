import { seedLocationData } from "./seedLocationData";

async function main() {
  console.log("🚀 Starting location data seeding...");
  
  try {
    await seedLocationData();
    console.log("🎉 Location data seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Error during location seeding:", error);
    process.exit(1);
  }
}

main();