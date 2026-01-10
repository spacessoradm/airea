import { seedTransportStations } from "./seedTransportStations";

async function run() {
  console.log("🚇 Running transport stations seeding...");
  try {
    const result = await seedTransportStations();
    console.log("✅ Seeding completed successfully:", result);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
  process.exit(0);
}

run();