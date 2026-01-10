import { db } from "./db";
import { developerReviews, type InsertDeveloperReview } from "@shared/schema";

const sampleReviews: InsertDeveloperReview[] = [
  {
    userId: null, // Anonymous
    developerName: "Sime Darby Property",
    projectName: "Elmina Green",
    rating: 5,
    title: "Excellent build quality and location",
    review: "I've been living in Elmina Green for 2 years now and absolutely love it. The build quality is top-notch, with no defects whatsoever. The location is convenient with easy access to highways and the Elmina Lakeside Mall. The developer was responsive to all queries during the purchase process. Highly recommended!",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Sime Darby Property", 
    projectName: "Elmina East",
    rating: 4,
    title: "Good value for money with minor issues",
    review: "Overall satisfied with the purchase. The house design is modern and functional. However, there were some delays in handover and a few minor defects that took time to rectify. The customer service team was helpful though. The area is developing well with good amenities nearby.",
    experience: "buyer",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "UEM Sunrise",
    projectName: "Mont Kiara Meridin",
    rating: 3,
    title: "Average experience, room for improvement",
    review: "The location is great being in Mont Kiara, but the build quality could be better. Found several defects during handover including water seepage and uneven flooring. The management was slow to respond to complaints. For the price paid, expected much better quality control.",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "UEM Sunrise",
    projectName: "Teega Residences",
    rating: 4,
    title: "Well-planned development with good facilities",
    review: "Living here for 18 months now. The facilities are well-maintained and the security is excellent. The units are spacious and well-designed. Only complaint is the parking space which is quite tight. The developer has been responsive to community feedback and continuously improving the facilities.",
    experience: "tenant",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "SP Setia",
    projectName: "Setia Eco Park",
    rating: 5,
    title: "Outstanding eco-friendly development",
    review: "This is hands down one of the best developments I've seen. The green concept is well-executed with beautiful parks and lakes. The build quality is exceptional and the customer service is top-notch. Worth every penny! The township concept works really well with all amenities within walking distance.",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "SP Setia",
    projectName: "Setia Sky Residences",
    rating: 4,
    title: "Great high-rise living with minor concerns",
    review: "The views are spectacular and the facilities are world-class. However, the lift waiting time during peak hours can be frustrating. The management is professional and maintains the common areas well. Good investment potential given the prime location.",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Gamuda Land",
    projectName: "Gamuda Gardens",
    rating: 5,
    title: "Perfect family-friendly environment",
    review: "As a family with young children, this development ticks all the boxes. Safe environment, good schools nearby, beautiful parks, and excellent build quality. The developer really thought about the community needs. The only downside is the traffic during peak hours, but that's expected in a popular area.",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Gamuda Land",
    projectName: "Twentyfive.7",
    rating: 3,
    title: "Mixed experience with service quality",
    review: "The concept is innovative and the location is strategic. However, there were significant delays in completion and several defects upon handover. The customer service team was not very helpful initially, though they improved over time. The facilities are nice once everything was sorted out.",
    experience: "buyer",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Tropicana Corporation",
    projectName: "Tropicana Gardens",
    rating: 4,
    title: "Well-established developer with good track record",
    review: "This is my second purchase from Tropicana and they maintain consistent quality. The sales team was professional and transparent about all costs. Handover was smooth with minimal defects. The common facilities are well-maintained. Would consider buying from them again.",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "KLCC Property Holdings",
    projectName: "Four Seasons Place",
    rating: 5,
    title: "Luxury living at its finest",
    review: "Exceptional quality and service from start to finish. The attention to detail is remarkable and the after-sales service is outstanding. Yes, it's expensive, but you get what you pay for. The location in KLCC is unbeatable. Perfect for those who want the best.",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Mah Sing Group",
    projectName: "M Arisa",
    rating: 2,
    title: "Disappointing experience with multiple issues",
    review: "Unfortunately, my experience was not pleasant. Multiple defects upon handover including cracked walls and faulty electrical wiring. The customer service was unresponsive and it took months to get issues resolved. For the price paid, expected much better quality. Would not recommend.",
    experience: "buyer",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Mah Sing Group",
    projectName: "M Centura",
    rating: 3,
    title: "Average development with room for improvement",
    review: "The location is good and the price was reasonable. However, the build quality is just average with several minor defects. The management office is helpful but response time could be faster. It's an okay choice if you're looking for something affordable in the area.",
    experience: "tenant",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "IJM Land",
    projectName: "Seremban 2",
    rating: 4,
    title: "Well-planned township with good potential",
    review: "Living here for 3 years and have seen the area develop nicely. The master planning is excellent with good mix of residential and commercial areas. The developer continues to invest in infrastructure and amenities. Good long-term investment potential.",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Sunway Property",
    projectName: "Sunway Montana",
    rating: 4,
    title: "Good quality with excellent amenities",
    review: "The integrated development concept works well. Having shopping mall, medical center, and schools all nearby is very convenient. The build quality is good and the customer service is responsive. The only issue is the crowded weekends, but that shows how popular the place is!",
    experience: "owner",
    isAnonymous: true,
    isVerified: false,
  },
  {
    userId: null,
    developerName: "Sunway Property",
    projectName: "Sunway Velocity",
    rating: 5,
    title: "Urban living at its best",
    review: "Perfect for young professionals and small families. The connectivity is excellent with multiple transport options. The facilities are modern and well-maintained. The developer has a good reputation and it shows in the quality of work. Highly satisfied with the purchase.",
    experience: "owner", 
    isAnonymous: true,
    isVerified: false,
  }
];

export async function seedDeveloperReviews() {
  try {
    console.log("Seeding developer reviews...");
    
    // Check if reviews already exist
    const existingReviews = await db.select().from(developerReviews).limit(1);
    if (existingReviews.length > 0) {
      console.log("Developer reviews already exist, skipping seed");
      return { message: "Developer reviews already exist", count: 0 };
    }

    // Insert sample reviews
    const insertedReviews = await db.insert(developerReviews).values(sampleReviews).returning();
    
    console.log(`Seeded ${insertedReviews.length} developer reviews`);
    return { 
      message: "Developer reviews seeded successfully", 
      count: insertedReviews.length,
      reviews: insertedReviews
    };
  } catch (error) {
    console.error("Error seeding developer reviews:", error);
    throw error;
  }
}