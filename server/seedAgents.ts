import { db } from "./db";
import { agents, properties } from "@shared/schema";
import { eq } from "drizzle-orm";

const agentData = [
  {
    id: "agent-yap-oon-teng",
    name: "Yap Oon Teng",
    email: "yap.oonteng@propertyexpert.my",
    phone: "+60 12-345 6789",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
    company: "RE/MAX Realty",
    license: "REN 12345",
    specialties: ["Condominium", "Luxury Properties", "Investment"],
    bio: "Experienced property consultant specializing in Klang Valley condominiums with 8+ years in the industry.",
    rating: "4.8",
    totalReviews: 127,
  },
  {
    id: "agent-ray-yeow",
    name: "Ray Yeow",
    email: "ray.yeow@hartamas.com.my",
    phone: "+60 16-789 0123",
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
    company: "Hartamas Real Estate",
    license: "REN 23456",
    specialties: ["Apartment", "First-time Buyers", "Rental"],
    bio: "Dedicated agent helping first-time buyers and investors find their perfect property in KL and Selangor.",
    rating: "4.6",
    totalReviews: 89,
  },
  {
    id: "agent-juliana",
    name: "Juliana",
    email: "juliana@hartamas.com.my",
    phone: "+60 19-456 7890",
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
    company: "Hartamas Real Estate",
    license: "REN 34567",
    specialties: ["Luxury Properties", "Pool Villas", "High-end Rentals"],
    bio: "Luxury property specialist with expertise in premium residential properties and high-end rentals.",
    rating: "4.9",
    totalReviews: 156,
  },
  {
    id: "agent-sarah-lim",
    name: "Sarah Lim",
    email: "sarah.lim@propertyhub.my",
    phone: "+60 12-567 8901",
    profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
    company: "Property Hub Sdn Bhd",
    license: "REN 45678",
    specialties: ["Townhouse", "Family Homes", "Suburban Properties"],
    bio: "Family-oriented agent specializing in suburban properties and helping families find their dream homes.",
    rating: "4.7",
    totalReviews: 203,
  },
  {
    id: "agent-marcus-wong",
    name: "Marcus Wong",
    email: "marcus.wong@eliteproperties.my",
    phone: "+60 17-678 9012",
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
    company: "Elite Properties",
    license: "REN 56789",
    specialties: ["Commercial", "Investment", "Development"],
    bio: "Commercial property expert with strong background in investment properties and new developments.",
    rating: "4.5",
    totalReviews: 78,
  },
];

export async function seedAgents() {
  try {
    console.log("🌱 Seeding agent data...");

    // Insert agents
    for (const agent of agentData) {
      await db
        .insert(agents)
        .values(agent)
        .onConflictDoUpdate({
          target: agents.id,
          set: {
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            profileImage: agent.profileImage,
            company: agent.company,
            license: agent.license,
            specialties: agent.specialties,
            bio: agent.bio,
            rating: agent.rating,
            totalReviews: agent.totalReviews,
          },
        });
    }

    console.log("✅ Agent data seeded successfully!");

    // Now update existing properties to use real agent IDs
    console.log("🔄 Updating property agent assignments...");
    
    const allProperties = await db.select().from(properties);
    
    for (let i = 0; i < allProperties.length; i++) {
      const property = allProperties[i];
      const agentIndex = i % agentData.length; // Distribute properties across agents
      const assignedAgent = agentData[agentIndex];
      
      await db
        .update(properties)
        .set({ 
          agentId: assignedAgent.id,
          // Update the createdAt to be recent with some variation
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time within last 7 days
        })
        .where(eq(properties.id, property.id));
    }

    console.log("✅ Property agent assignments updated!");
    
  } catch (error) {
    console.error("❌ Error seeding agent data:", error);
    throw error;
  }
}

// Run if this file is executed directly
seedAgents()
  .then(() => {
    console.log("Agent seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Agent seeding failed:", error);
    process.exit(1);
  });