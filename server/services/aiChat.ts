import OpenAI from "openai";
import { processAISearch } from "./propertySearch";
import { SimplifiedSearchService } from "./simplifiedSearchService";
import { NLPSearchService } from "./nlpSearchService";
import type { Property } from "@shared/schema";

// Using GPT-4o for intelligent property conversations - the most capable available model
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SearchResult {
  properties: Property[];
  count: number;
  filters: any;
  query: string;
}

const SYSTEM_PROMPT = `You are a knowledgeable Malaysian property expert and AI assistant specializing in the Klang Valley real estate market. You help users with property searches, investment decisions, market insights, and general real estate guidance.

CONTEXT & EXPERTISE:
- Malaysian property market specialist with deep knowledge of Klang Valley areas
- Expert in condos, apartments, landed properties, and commercial real estate
- Current market trends, pricing, and investment opportunities
- Transport connectivity (MRT/LRT), schools, amenities, and lifestyle factors
- Developer reputations, project quality, and community reviews
- Mortgage financing, rental yields, and investment strategies

KEY AREAS OF FOCUS:
- Mont Kiara, KLCC, Damansara, Petaling Jaya, Shah Alam, Subang Jaya, Cyberjaya
- Property types: Condos, apartments, terrace houses, semi-detached, bungalows
- Price ranges: Budget-friendly (RM300k-600k), Mid-range (RM600k-1.5M), Luxury (RM1.5M+)
- Investment properties with good rental yields (4-7% annually)

RESPONSE STYLE:
- Conversational, helpful, and personalized
- Ask follow-up questions to understand user needs better
- Provide specific examples and practical advice
- Reference platform features (AI search, Yield Heat Map, Mortgage Calculator, Project Reviews)
- Keep responses concise but informative (2-4 sentences typically)
- Use Malaysian context (RM currency, local area names, transportation systems)

PLATFORM INTEGRATION:
- Encourage using the AI search feature for property searches
- Reference the Insights menu for market analysis and developer reviews
- Suggest the Mortgage Calculator for financing estimates
- Mention transport proximity features for commuter-friendly options

Always be helpful, accurate, and focused on helping users make informed property decisions in Malaysia.`;

// AI Chat service for property-related conversations using OpenAI GPT-4
export async function generateAIResponse(message: string): Promise<string> {
  console.log(`🤖 Generating AI response for: "${message}"`);
  
  try {
    // Step 1: Detect if this is a property search request
    const searchIntent = await detectSearchIntent(message);
    
    if (searchIntent.isSearch) {
      console.log(`🔍 SEARCH DETECTED: User wants property search - ${searchIntent.confidence}% confidence`);
      console.log(`🎯 Search criteria detected:`, searchIntent.criteria);
      
      // Step 2: Perform actual property search
      const searchResults = await performPropertySearch(message, searchIntent.criteria);
      
      // Step 3: Format results for chat display
      if (searchResults && searchResults.count > 0) {
        return formatSearchResultsForChat(searchResults, message);
      } else {
        return formatNoResultsResponse(message, searchIntent.criteria);
      }
    }

    // Step 4: For non-search queries, use regular AI advice
    return await generateAIAdvice(message);
    
  } catch (error) {
    console.error("❌ AI Chat Error:", error);
    return getFallbackResponse(message);
  }
}

// Detect if user wants to search for properties
async function detectSearchIntent(message: string): Promise<{
  isSearch: boolean;
  confidence: number;
  criteria: any;
}> {
  const lowerMessage = message.toLowerCase();
  
  // Strong search intent keywords
  const strongSearchKeywords = [
    'show me', 'find me', 'search for', 'looking for', 'i want', 'i need',
    'can you find', 'help me find', 'recommend', 'suggest', 'what properties',
    'any properties', 'properties available'
  ];
  
  // Property-specific keywords
  const propertyKeywords = [
    'condo', 'condominium', 'apartment', 'house', 'property', 'properties',
    'unit', 'room', 'bedroom', 'studio', 'office', 'shop', 'commercial',
    'rent', 'rental', 'sale', 'buy', 'purchase'
  ];
  
  // Location/price keywords
  const contextKeywords = [
    'near', 'in ', 'at ', 'around', 'mont kiara', 'klcc', 'petaling jaya',
    'rm', 'ringgit', 'under', 'below', 'above', 'budget', 'price'
  ];
  
  let confidence = 0;
  
  // Check for strong search intent
  if (strongSearchKeywords.some(keyword => lowerMessage.includes(keyword))) {
    confidence += 40;
  }
  
  // Check for property keywords
  if (propertyKeywords.some(keyword => lowerMessage.includes(keyword))) {
    confidence += 30;
  }
  
  // Check for context (location, price)
  if (contextKeywords.some(keyword => lowerMessage.includes(keyword))) {
    confidence += 20;
  }
  
  // Additional context clues
  if (lowerMessage.includes('?')) confidence += 10; // Questions often indicate search
  if (lowerMessage.match(/\d+\s*(bedroom|bed|rm|k)/)) confidence += 15; // Specific criteria
  
  const isSearch = confidence >= 60;
  
  // Extract basic criteria for search
  let criteria = {};
  if (isSearch) {
    try {
      const nlpService = new NLPSearchService();
      criteria = await nlpService.parseSearchQuery(message);
    } catch (error) {
      console.log('NLP parsing failed, using basic criteria');
      criteria = extractBasicCriteria(message);
    }
  }
  
  return {
    isSearch,
    confidence,
    criteria
  };
}

// Extract basic search criteria without NLP service
function extractBasicCriteria(message: string): any {
  const lowerMessage = message.toLowerCase();
  const criteria: any = {};
  
  // Extract bedrooms
  const bedroomMatch = message.match(/(\d+)\s*(?:bed|bedroom|br)/i);
  if (bedroomMatch) {
    criteria.bedrooms = parseInt(bedroomMatch[1]);
  }
  
  // Extract price
  const priceMatch = message.match(/(?:under|below|less than|within)\s*rm\s*([\d,]+)k?/i);
  if (priceMatch) {
    let price = parseFloat(priceMatch[1].replace(',', ''));
    if (message.toLowerCase().includes('k')) price *= 1000;
    criteria.maxPrice = price;
  }
  
  // Extract property type
  if (lowerMessage.includes('condo')) criteria.propertyType = 'condominium';
  else if (lowerMessage.includes('apartment')) criteria.propertyType = 'apartment';
  else if (lowerMessage.includes('house')) criteria.propertyType = 'house';
  
  // Extract listing type
  if (lowerMessage.includes('rent')) criteria.listingType = 'rent';
  else if (lowerMessage.includes('buy') || lowerMessage.includes('sale')) criteria.listingType = 'sale';
  
  return criteria;
}

// Perform actual property search using existing services
async function performPropertySearch(message: string, criteria: any): Promise<SearchResult | null> {
  try {
    console.log(`🔍 PERFORMING SEARCH: query="${message}", criteria=`, criteria);
    
    // Determine search type (rent/buy)
    const searchType = criteria.listingType === 'sale' ? 'buy' : 'rent';
    
    // Use the main processAISearch function (same as /api/search/ai endpoint)
    const searchResult = await processAISearch(message, searchType);
    
    console.log(`✅ SEARCH COMPLETED: Found ${searchResult.count} properties`);
    
    return searchResult;
    
  } catch (error) {
    console.error('❌ Property search failed:', error);
    
    // Fallback to simplified search
    try {
      const simplifiedSearch = new SimplifiedSearchService();
      const result = await simplifiedSearch.searchProperties(message, criteria, 10);
      
      return {
        properties: result.results.map((r: any) => r.property || r),
        count: result.count,
        filters: criteria,
        query: message
      };
    } catch (fallbackError) {
      console.error('❌ Fallback search also failed:', fallbackError);
      return null;
    }
  }
}

// Format search results for chat display
function formatSearchResultsForChat(searchResults: SearchResult, originalQuery: string): string {
  const { properties, count } = searchResults;
  
  if (!properties || properties.length === 0) {
    return `I couldn't find any properties matching "${originalQuery}". Try adjusting your criteria or check our main search page for more options.`;
  }
  
  // Take top 3-5 results for chat display
  const displayProperties = properties.slice(0, Math.min(5, properties.length));
  
  let response = `Great! I found ${count} properties matching your criteria. Here are the top results:\n\n`;
  
  displayProperties.forEach((property, index) => {
    const price = formatPrice(typeof property.price === 'string' ? parseFloat(property.price) : property.price);
    const location = property.city || property.state || 'Location not specified';
    const bedrooms = property.bedrooms ? `${property.bedrooms}BR ` : '';
    const propertyType = property.propertyType || 'Property';
    
    response += `${index + 1}. **${property.title}**\n`;
    response += `   💰 ${price} | 🏠 ${bedrooms}${propertyType} | 📍 ${location}\n`;
    
    if (property.description && property.description.length > 0) {
      const shortDesc = property.description.substring(0, 80);
      response += `   ${shortDesc}${property.description.length > 80 ? '...' : ''}\n`;
    }
    response += `\n`;
  });
  
  if (count > displayProperties.length) {
    const remaining = count - displayProperties.length;
    response += `📋 Plus ${remaining} more properties available. `;
  }
  
  response += `\n🔍 Use our main search page for detailed filters, photos, and agent contacts!`;
  
  return response;
}

// Format no results response with helpful suggestions
function formatNoResultsResponse(originalQuery: string, criteria: any): string {
  let response = `I couldn't find properties matching your exact criteria for "${originalQuery}". `;
  
  // Provide helpful suggestions based on criteria
  const suggestions = [];
  
  if (criteria.maxPrice) {
    suggestions.push(`Try increasing your budget above RM${criteria.maxPrice?.toLocaleString()}`);
  }
  
  if (criteria.bedrooms && criteria.bedrooms > 2) {
    suggestions.push(`Consider ${criteria.bedrooms - 1}-bedroom options for more availability`);
  }
  
  if (criteria.propertyType) {
    const alternativeTypes = getAlternativePropertyTypes(criteria.propertyType);
    if (alternativeTypes.length > 0) {
      suggestions.push(`Look into ${alternativeTypes.join(' or ')} as alternatives`);
    }
  }
  
  if (suggestions.length > 0) {
    response += `Here are some suggestions:\n\n${suggestions.map(s => `• ${s}`).join('\n')}`;
  } else {
    response += `Try broadening your search criteria or exploring different areas in the Klang Valley.`;
  }
  
  response += `\n\n💡 You can also use our AI search feature above or browse popular areas like Mont Kiara, KLCC, or Petaling Jaya.`;
  
  return response;
}

// Get alternative property types
function getAlternativePropertyTypes(propertyType: string): string[] {
  const alternatives: Record<string, string[]> = {
    'condominium': ['apartments', 'service residences'],
    'apartment': ['condominiums', 'studios'],
    'house': ['townhouses', 'semi-detached houses'],
    'studio': ['apartments', 'service residences']
  };
  
  return alternatives[propertyType] || [];
}

// Format price for display
function formatPrice(price: number | null | undefined): string {
  if (!price || price === 0) return 'Price on request';
  
  if (price >= 1000000) {
    return `RM${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `RM${(price / 1000).toFixed(0)}K`;
  } else {
    return `RM${price.toLocaleString()}`;
  }
}

// Generate AI advice for non-search queries
async function generateAIAdvice(message: string): Promise<string> {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OpenAI API key not found in environment variables");
      return getFallbackResponse(message);
    }
    
    console.log("✅ OpenAI API key found, making API call...");
    
    // Use GPT-4 - the most stable and reliable model
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o - the newest OpenAI model released May 13, 2024
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 300, // Keep responses concise but informative
      temperature: 0.7, // Slightly creative but focused responses
    });

    console.log("📊 OpenAI API Response Details:");
    console.log("- Model used:", "gpt-4o");
    console.log("- Input message length:", message?.length || 0);
    console.log("- Response object type:", typeof response);
    console.log("- Response choices count:", response.choices?.length || 0);
    
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      console.log("- First choice object:", typeof choice);
      console.log("- Message object:", typeof choice?.message);
      console.log("- Content type:", typeof choice?.message?.content);
      console.log("- Content value:", choice?.message?.content || "NULL/EMPTY");
    } else {
      console.log("❌ No choices in response!");
      console.log("- Full response:", JSON.stringify(response, null, 2));
    }

    const aiResponse = response.choices[0]?.message?.content;
    
    if (aiResponse && aiResponse.trim()) {
      console.log(`✅ OpenAI SUCCESS: Generated ${aiResponse.length} characters`);
      return aiResponse;
    } else {
      console.log("❌ OpenAI returned empty/null content, using fallback");
      return getFallbackResponse(message);
    }
    
  } catch (error) {
    console.error("❌ OpenAI API Error Details:");
    console.error("- Error type:", typeof error);
    console.error("- Error message:", (error as any)?.message || "Unknown");
    console.error("- Error code:", (error as any)?.code || "None");
    console.error("- Error status:", (error as any)?.status || "None");
    console.error("- Full error:", error);
    
    // Graceful fallback to rule-based system if OpenAI fails
    return getFallbackResponse(message);
  }
}

// Fallback function for when OpenAI API is unavailable
function getFallbackResponse(message: string): string {
  const lowercaseMessage = message.toLowerCase();
  
  // Property search related queries
  if (lowercaseMessage.includes('search') || lowercaseMessage.includes('find') || lowercaseMessage.includes('looking for')) {
    if (lowercaseMessage.includes('condo') || lowercaseMessage.includes('apartment')) {
      return "I can help you find condos and apartments! Try our AI search above with natural language like 'Family-friendly condo near good schools under RM3000' or tell me your specific requirements.";
    }
    if (lowercaseMessage.includes('house') || lowercaseMessage.includes('landed')) {
      return "Looking for landed properties? I can help you find houses, terrace houses, and bungalows. What's your preferred area and budget range?";
    }
    if (lowercaseMessage.includes('investment')) {
      return "For investment properties, consider rental yield, location growth, and maintenance costs. What's your investment budget and preferred area?";
    }
    return "I can help you search for properties! Use our AI search feature above or tell me what type of property you're looking for.";
  }
  
  // Location and pricing queries
  if (lowercaseMessage.includes('area') || lowercaseMessage.includes('location') || lowercaseMessage.includes('price') || lowercaseMessage.includes('cost')) {
    return "Popular areas in Klang Valley include Mont Kiara, KLCC, Damansara, and Petaling Jaya. Property prices vary significantly by location - condos in KLCC typically range from RM800k-3M+. What specific area interests you?";
  }
  
  // Investment and yield queries
  if (lowercaseMessage.includes('yield') || lowercaseMessage.includes('rental return') || lowercaseMessage.includes('investment')) {
    return "Good rental yields in Malaysia typically range from 4-7% annually. Areas like Cyberjaya and Subang Jaya offer attractive returns. Check our Yield Heat Map in the Insights menu for detailed analysis!";
  }
  
  // Transport and amenities
  if (lowercaseMessage.includes('mrt') || lowercaseMessage.includes('lrt') || lowercaseMessage.includes('transport') || lowercaseMessage.includes('amenities')) {
    return "Properties near MRT/LRT stations command higher prices and better rental yields. Modern developments offer amenities like pools, gyms, and security. What specific features are important to you?";
  }
  
  // General greetings
  if (lowercaseMessage.includes('hello') || lowercaseMessage.includes('hi') || lowercaseMessage.includes('help')) {
    return "Hello! I'm your AI property assistant for Malaysian real estate. I can help with property searches, market insights, investment advice, and area recommendations. What would you like to know?";
  }
  
  // Thanks
  if (lowercaseMessage.includes('thank')) {
    return "You're welcome! Feel free to ask me anything about Malaysian properties, areas, or investment opportunities. I'm here to help!";
  }
  
  // Default fallback
  return "I'm here to help with your property questions! You can ask about specific areas, property searches, market trends, investment opportunities, or use our AI search feature above for detailed property matching.";
}