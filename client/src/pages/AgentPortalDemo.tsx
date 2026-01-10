import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Home, 
  Plus, 
  Eye, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Calendar,
  MapPin,
  Bed,
  Bath,
  Square,
  Star,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Wand2,
  Loader2,
  X,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import PropertyCard from "@/components/PropertyCard";
import type { Property } from "@shared/schema";

// Sample property data for preview
const sampleProperty: Property = {
  id: "preview-1",
  title: "Luxury Condo in KLCC",
  description: "Modern 3-bedroom condominium with stunning city views, premium fittings, and resort-style facilities.",
  price: "3500",
  listingType: "rent",
  propertyType: "condominium",
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1200,
  address: "Jalan P. Ramlee",
  city: "KLCC",
  state: "Kuala Lumpur",
  postalCode: "50088",

  latitude: "3.1570",
  longitude: "101.7123",
  images: [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=800&h=600&fit=crop"
  ],
  amenities: ["Swimming Pool", "Gym", "Security", "Parking"],
  featured: true,
  status: "active",
  agentId: "agent-1",
  createdAt: new Date(),
  updatedAt: new Date()
};

const stats = [
  { label: "Active Listings", value: "12", icon: Home, color: "text-blue-600" },
  { label: "Total Views", value: "2,847", icon: Eye, color: "text-green-600" },
  { label: "Inquiries", value: "38", icon: MessageSquare, color: "text-purple-600" },
  { label: "This Month Revenue", value: "RM15,400", icon: DollarSign, color: "text-orange-600" },
];

const recentListings = [
  { id: 1, title: "The Peak Residences - Unit 24-08", price: "RM3,500", status: "Active", views: 156, inquiries: 8, location: "Jalan P. Ramlee, KLCC" },
  { id: 2, title: "Elmina Green Terrace House", price: "RM2,800", status: "Active", views: 203, inquiries: 12, location: "Elmina Green, Shah Alam" },
  { id: 3, title: "Bangsar Village II - Penthouse", price: "RM8,500", status: "Pending", views: 89, inquiries: 5, location: "Jalan Telawi 2, Bangsar" },
  { id: 4, title: "Kepong Baru Apartment", price: "RM1,800", status: "Active", views: 134, inquiries: 6, location: "Taman Fadason, Kepong" },
];

// Static condo/building names list with location details
const staticPropertyNames = [

  { name: "The Peak Residences", location: "KLCC, Kuala Lumpur", street: "Jalan P. Ramlee" },
  { name: "Suria KLCC", location: "KLCC, Kuala Lumpur", street: "Jalan Ampang" },
  { name: "Petronas Twin Towers", location: "KLCC, Kuala Lumpur", street: "Jalan Ampang" },
  { name: "Bangsar Village II", location: "Bangsar, Kuala Lumpur", street: "Jalan Telawi 2" },
  { name: "Mont Kiara Aman", location: "Mont Kiara, Kuala Lumpur", street: "Jalan Kiara 3" },
  { name: "11 Mont Kiara", location: "Mont Kiara, Kuala Lumpur", street: "Jalan 11/70A" },
  { name: "Arcoris Mont Kiara", location: "Mont Kiara, Kuala Lumpur", street: "Jalan Kiara 1" },
  { name: "Verve Suites Mont Kiara", location: "Mont Kiara, Kuala Lumpur", street: "Jalan Kiara" },
  { name: "Solaris Dutamas", location: "Dutamas, Kuala Lumpur", street: "Jalan Dutamas 1" },
  { name: "Publika Solaris Dutamas", location: "Dutamas, Kuala Lumpur", street: "Jalan Dutamas 1" },
  { name: "KL Gateway Premium Suites", location: "Bangsar South, Kuala Lumpur", street: "Jalan Kerinchi" },
  { name: "Marc Service Residence", location: "KLCC, Kuala Lumpur", street: "Jalan P. Ramlee" },
  { name: "Summer Suites Residences", location: "KLCC, Kuala Lumpur", street: "Jalan Cendana" },
  { name: "Elmina Green Serviced Residences", location: "Elmina, Shah Alam", street: "Jalan Elmina Green" },
  { name: "Setia V Residences", location: "Gurney Drive, Penang", street: "Jalan Gurney" },
  { name: "The Westside Three", location: "Desa ParkCity, Kuala Lumpur", street: "Jalan Intisari Perdana" },
  { name: "Nadayu 28", location: "Melawati, Kuala Lumpur", street: "Jalan Melawati 1" },
  { name: "Twins Damansara", location: "Damansara Heights, Kuala Lumpur", street: "Jalan Semantan" }
];

// Malaysian townships and cities for location selection
const malaysianLocations = [
  "Kuala Lumpur", "KLCC", "Bukit Bintang", "Bangsar", "Mid Valley", "KL Sentral", "Ampang",
  "Petaling Jaya", "Subang Jaya", "Bandar Sunway", "Kelana Jaya", "Section 14", "SS2",
  "Shah Alam", "Kota Kemuning", "Setia Alam", "Bandar Botanik", "Elmina",
  "Mont Kiara", "Sri Hartamas", "Desa Sri Hartamas", "Dutamas", "Segambut",
  "Kota Damansara", "Bandar Utama", "Damansara Heights", "Damansara Perdana", "Mutiara Damansara",
  "Cheras", "Kajang", "Bangi", "Serdang", "Puchong", "Cyberjaya", "Putrajaya",
  "Wangsa Maju", "Setapak", "Gombak", "Batu Caves", "Kepong", "Sentul",
  "Taman Tun Dr Ismail", "Bukit Jalil", "Sri Petaling", "Happy Garden", "Kuchai Lama",
  "Old Klang Road", "Jalan Ipoh", "Brickfields", "Chinatown", "Little India"
];

// Title types for property listings
const titleTypes = [
  { value: "master", label: "Master Title" },
  { value: "individual", label: "Individual Title" },
  { value: "strata", label: "Strata Title" }
];

export default function AgentPortalDemo() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [previewProperty, setPreviewProperty] = useState(sampleProperty);
  const [aiInput, setAiInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedPropertyName, setSelectedPropertyName] = useState(staticPropertyNames[0]);
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [landSize, setLandSize] = useState("");
  const [titleType, setTitleType] = useState("");

  const updatePreviewProperty = (field: string, value: string | number) => {
    setPreviewProperty(prev => ({
      ...prev,
      [field]: field === 'bedrooms' || field === 'bathrooms' ? Number(value) : value
    }));
  };

  const generateListingWithAI = async () => {
    if (!aiInput.trim()) return;
    
    setIsGenerating(true);
    setIsLoadingLocation(true);
    
    try {
      // Enhanced AI parsing to extract building name from the input
      const extractedData = parsePropertyWithAI(aiInput);
      
      // If building name is found, get location from Google Maps
      let locationData = null;
      if (extractedData.buildingName) {
        locationData = await getLocationFromGoogleMaps(extractedData.buildingName);
      }
      
      setIsLoadingLocation(false);
      
      // Mock AI-generated property data based on extracted information
      const generatedProperty = {
        ...sampleProperty,
        id: "ai-generated-" + Date.now(),
        title: extractedData.buildingName || "AI Generated Property",
        description: generateDescription(aiInput),
        price: extractedData.price || extractPrice(aiInput) || "3000",
        listingType: extractedData.listingType || "rent",
        propertyType: extractedData.propertyType || "condominium",
        bedrooms: extractedData.bedrooms || extractBedrooms(aiInput) || 3,
        bathrooms: extractedData.bathrooms || extractBathrooms(aiInput) || 2,
        squareFeet: extractedData.squareFeet || extractSquareFeet(aiInput) || 1200,
        address: locationData?.address || "Address TBD",
        city: locationData?.township || "Kuala Lumpur",
        amenities: extractedData.amenities || ["Swimming Pool", "Gym", "Security", "Parking"],
        images: selectedImages.length > 0 ? selectedImages : sampleProperty.images,
      };
      
      setPreviewProperty(generatedProperty);
      setIsGenerating(false);
      setShowAiModal(false);
      setActiveTab("preview");
      
      // Show success notification with detected location
      if (locationData?.township && extractedData.buildingName) {
        setTimeout(() => {
          alert(`✅ AI Successfully Detected!\n\nBuilding: ${extractedData.buildingName}\nLocation: ${locationData.township}\nPrice: RM${extractedData.price || generatedProperty.price}\nSize: ${extractedData.squareFeet || generatedProperty.squareFeet} sqft`);
        }, 500);
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      setIsGenerating(false);
      setIsLoadingLocation(false);
    }
  };

  // Enhanced AI parsing function for Malaysian property listings
  const parsePropertyWithAI = (input: string) => {
    // Enhanced regex patterns for better extraction
    const buildingMatch = input.match(/([A-Za-z\s\-']+(?:\s+\d+)?)\s+for\s+(rent|sale)/i);
    const priceMatch = input.match(/RM\s*([0-9,]+)|([0-9,]+)\s*(?:per\s+month|\/month|\s+rent)/i);
    const sizeMatch = input.match(/(\d+)\s*sqft|(\d+)\s*sq\.?\s*ft\.?|built\s+up\s+size\s+(\d+)|size\s+(\d+)/i);
    const bedroomMatch = input.match(/(\d+)\s+bedroom|(\d+)br|(\d+)\s+bed/i);
    const bathroomMatch = input.match(/(\d+)\s+bathroom|(\d+)ba|(\d+)\s+bath/i);
    const amenitiesMatch = input.match(/(?:with|includes?|features?|amenities?)\s+([^.]+)/i);
    
    return {
      buildingName: buildingMatch ? buildingMatch[1].trim() : null,
      listingType: buildingMatch ? buildingMatch[2].toLowerCase() : 'rent',
      price: priceMatch ? (priceMatch[1] || priceMatch[2]).replace(/,/g, '') : null,
      squareFeet: sizeMatch ? parseInt(sizeMatch[1] || sizeMatch[2] || sizeMatch[3] || sizeMatch[4]) : null,
      bedrooms: bedroomMatch ? parseInt(bedroomMatch[1] || bedroomMatch[2] || bedroomMatch[3]) : null,
      bathrooms: bathroomMatch ? parseInt(bathroomMatch[1] || bathroomMatch[2] || bathroomMatch[3]) : null,
      amenities: amenitiesMatch ? 
        amenitiesMatch[1].split(/,|\sand\s/).map(a => a.trim()).filter(a => a) : null,
      propertyType: input.toLowerCase().includes('condo') ? 'condominium' : 
                   input.toLowerCase().includes('apartment') ? 'apartment' :
                   input.toLowerCase().includes('house') ? 'house' : 'condominium'
    };
  };

  // Enhanced Google Maps location detection for Malaysian buildings
  const getLocationFromGoogleMaps = async (buildingName: string) => {
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Comprehensive Malaysian property location database
    const locationDatabase = {
      // Kota Damansara & Petaling Jaya
      'casa indah 1': {
        address: 'Casa Indah 1, Jalan PJU 5/1',
        township: 'Kota Damansara',
        postalCode: '47810',
        latitude: 3.1725,
        longitude: 101.5938
      },
      'casa tropicana': {
        address: 'Casa Tropicana, Jalan SS 2/64',
        township: 'Tropicana', 
        postalCode: '47300',
        latitude: 3.1301,
        longitude: 101.6185
      },
      'tropicana grande': {
        address: 'Tropicana Grande, Jalan SS 2/72',
        township: 'Tropicana',
        postalCode: '47300',
        latitude: 3.1285,
        longitude: 101.6195
      },
      'the verve suites': {
        address: 'The Verve Suites, Jalan Kiara',
        township: 'Mont Kiara',
        postalCode: '50480',
        latitude: 3.1695,
        longitude: 101.6516
      },
      
      // Damansara Heights

      'kenny hills residence': {
        address: 'Kenny Hills Residence, Jalan Duta',
        township: 'Kenny Hills',
        postalCode: '50480',
        latitude: 3.1605,
        longitude: 101.6598
      },
      
      // Mont Kiara
      'mont kiara sophia': {
        address: 'Mont Kiara Sophia, Jalan Kiara',
        township: 'Mont Kiara',
        postalCode: '50480',
        latitude: 3.1725,
        longitude: 101.6506
      },
      'plaza mont kiara': {
        address: 'Plaza Mont Kiara, Jalan Kiara',
        township: 'Mont Kiara',
        postalCode: '50480',
        latitude: 3.1715,
        longitude: 101.6496
      },
      '11 mont kiara': {
        address: '11 Mont Kiara, Jalan Kiara',
        township: 'Mont Kiara',
        postalCode: '50480',
        latitude: 3.1735,
        longitude: 101.6526
      },
      
      // KLCC & City Center
      'klcc residences': {
        address: 'KLCC Residences, Jalan Pinang',
        township: 'KLCC',
        postalCode: '50088',
        latitude: 3.1570,
        longitude: 101.7123
      },
      'four seasons place': {
        address: 'Four Seasons Place, Jalan Ampang',
        township: 'KLCC',
        postalCode: '50450',
        latitude: 3.1595,
        longitude: 101.7118
      },
      'the troika': {
        address: 'The Troika, Jalan Tun Razak',
        township: 'KLCC',
        postalCode: '50400',
        latitude: 3.1528,
        longitude: 101.7189
      },
      
      // Bangsar & Mid Valley
      'bangsar peak': {
        address: 'Bangsar Peak, Jalan Riong',
        township: 'Bangsar',
        postalCode: '59100',
        latitude: 3.1285,
        longitude: 101.6735
      },
      'the gardens residences': {
        address: 'The Gardens Residences, Jalan Kerinchi',
        township: 'Mid Valley',
        postalCode: '59200',
        latitude: 3.1178,
        longitude: 101.6778
      },
      
      // Ampang & Cheras
      'ampang park': {
        address: 'Ampang Park, Jalan Ampang',
        township: 'Ampang',
        postalCode: '50450',
        latitude: 3.1615,
        longitude: 101.7045
      },
      'platinum lake pv': {
        address: 'Platinum Lake PV, Jalan Cheras',
        township: 'Cheras',
        postalCode: '56000',
        latitude: 3.0738,
        longitude: 101.7387
      },
      
      // Subang Jaya & Shah Alam  
      'subang parkhomes': {
        address: 'Subang Parkhomes, Jalan SS 19/6',
        township: 'Subang Jaya',
        postalCode: '47500',
        latitude: 3.1095,
        longitude: 101.5901
      },
      'empire damansara': {
        address: 'Empire Damansara, Jalan PJU 8/8',
        township: 'Damansara Perdana',
        postalCode: '47820',
        latitude: 3.1685,
        longitude: 101.5845
      },
      
      // Cyberjaya & Putrajaya
      'cyberjaya vogue': {
        address: 'Cyberjaya Vogue, Persiaran Multimedia',
        township: 'Cyberjaya',
        postalCode: '63000',
        latitude: 2.9167,
        longitude: 101.6500
      },
      'alamanda putrajaya': {
        address: 'Alamanda Putrajaya, Precinct 1',
        township: 'Putrajaya',
        postalCode: '62000',
        latitude: 2.9264,
        longitude: 101.6964
      }
    };
    
    const normalizedName = buildingName.toLowerCase().trim();
    
    // Try exact match first
    if (locationDatabase[normalizedName]) {
      return locationDatabase[normalizedName];
    }
    
    // Try partial matching
    for (const [key, location] of Object.entries(locationDatabase)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return location;
      }
    }
    
    // Try location lookup for unknown buildings
    const locationResult = await simulateLocationLookup(buildingName);
    if (locationResult) {
      return locationResult;
    }
    
    // Default fallback with building name
    return {
      address: `${buildingName}, Kuala Lumpur`,
      township: 'Kuala Lumpur',
      postalCode: '50450',  
      latitude: 3.1390,
      longitude: 101.6869
    };
  };

  // Simulate location lookup for comprehensive building search
  const simulateLocationLookup = async (buildingName: string) => {
    // This simulates what a location database would return for Malaysian buildings
    const normalizedName = buildingName.toLowerCase();
    
    // Common Malaysian building patterns and locations
    const buildingPatterns = [
      // Tropicana area buildings
      { pattern: 'tropicana', township: 'Tropicana', postalCode: '47300', lat: 3.1301, lng: 101.6185 },
      { pattern: 'kota damansara', township: 'Kota Damansara', postalCode: '47810', lat: 3.1725, lng: 101.5938 },
      { pattern: 'mont kiara', township: 'Mont Kiara', postalCode: '50480', lat: 3.1715, lng: 101.6506 },
      { pattern: 'bangsar', township: 'Bangsar', postalCode: '59100', lat: 3.1285, lng: 101.6735 },
      { pattern: 'damansara', township: 'Damansara Heights', postalCode: '50490', lat: 3.1515, lng: 101.6621 },
      { pattern: 'klcc', township: 'KLCC', postalCode: '50088', lat: 3.1570, lng: 101.7123 },
      { pattern: 'ampang', township: 'Ampang', postalCode: '50450', lat: 3.1615, lng: 101.7045 },
      { pattern: 'cheras', township: 'Cheras', postalCode: '56000', lat: 3.0738, lng: 101.7387 },
      { pattern: 'subang', township: 'Subang Jaya', postalCode: '47500', lat: 3.1095, lng: 101.5901 },
      { pattern: 'cyberjaya', township: 'Cyberjaya', postalCode: '63000', lat: 2.9167, lng: 101.6500 },
      { pattern: 'putrajaya', township: 'Putrajaya', postalCode: '62000', lat: 2.9264, lng: 101.6964 },
      { pattern: 'pj', township: 'Petaling Jaya', postalCode: '46200', lat: 3.1073, lng: 101.6424 },
      { pattern: 'ttdi', township: 'Taman Tun Dr Ismail', postalCode: '60000', lat: 3.1370, lng: 101.6242 },
      { pattern: 'hartamas', township: 'Sri Hartamas', postalCode: '50480', lat: 3.1685, lng: 101.6515 },
      { pattern: 'wangsa maju', township: 'Wangsa Maju', postalCode: '53300', lat: 3.2090, lng: 101.7340 }
    ];
    
    // Find matching pattern
    for (const pattern of buildingPatterns) {
      if (normalizedName.includes(pattern.pattern)) {
        return {
          address: `${buildingName}, ${pattern.township}`,
          township: pattern.township,
          postalCode: pattern.postalCode,
          latitude: pattern.lat,
          longitude: pattern.lng
        };
      }
    }
    
    return null;
  };;

  const extractPropertyNameFromInput = (input: string): string => {
    const inputLower = input.toLowerCase();
    
    // Look for matches in static property names
    const matchedProperty = staticPropertyNames.find(property => 
      inputLower.includes(property.name.toLowerCase()) || 
      property.name.toLowerCase().includes(inputLower.split(' ')[0])
    );
    
    return matchedProperty?.name || staticPropertyNames[0].name; // Default to first property
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageUrls: string[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            imageUrls.push(e.target.result as string);
            if (imageUrls.length === files.length) {
              setSelectedImages(prev => [...prev, ...imageUrls]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Filter properties and locations based on search query
  const filteredProperties = staticPropertyNames.filter(property => 
    property.name.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
    property.location.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
    property.street.toLowerCase().includes(propertySearchQuery.toLowerCase())
  );

  const filteredLocations = malaysianLocations.filter(location =>
    location.toLowerCase().includes(propertySearchQuery.toLowerCase())
  );

  // Combine filtered results - show properties first, then locations
  const combinedResults = [
    ...filteredProperties.map(p => ({ type: 'property', data: p })),
    ...filteredLocations.map(l => ({ type: 'location', data: { name: l, location: l, street: "" } }))
  ];

  const handlePropertySelect = (item: any) => {
    if (item.type === 'property') {
      setSelectedPropertyName(item.data);
      setPropertySearchQuery(item.data.name);
    } else {
      // For locations, create a location-based property
      const locationProperty = {
        name: item.data.name,
        location: item.data.name,
        street: ""
      };
      setSelectedPropertyName(locationProperty);
      setPropertySearchQuery(item.data.name);
    }
    setShowPropertyDropdown(false);
  };

  // Helper functions to extract information from AI input
  const extractBuildingName = (input: string): string => {
    const buildingKeywords = ['condo', 'condominium', 'tower', 'residences', 'heights', 'court', 'park'];
    const words = input.split(' ');
    
    // Look for capitalized words that might be building names
    for (let i = 0; i < words.length; i++) {
      if (words[i][0]?.toUpperCase() === words[i][0]) {
        // Check if next word is also capitalized or contains building keywords
        if (i + 1 < words.length && (
          words[i + 1][0]?.toUpperCase() === words[i + 1][0] ||
          buildingKeywords.some(keyword => words[i + 1]?.toLowerCase().includes(keyword))
        )) {
          return `${words[i]} ${words[i + 1]}`;
        }
      }
    }
    
    return "Premium Condo";
  };

  const extractPrice = (input: string): string => {
    const priceMatch = input.match(/rm\s*(\d+)/i) || input.match(/(\d+)\s*ringgit/i);
    return priceMatch ? priceMatch[1] : "3000";
  };

  const extractBedrooms = (input: string): number => {
    const bedroomMatch = input.match(/(\d+)\s*bed/i) || input.match(/(\d+)\s*br/i);
    return bedroomMatch ? parseInt(bedroomMatch[1]) : 3;
  };

  const extractBathrooms = (input: string): number => {
    const bathroomMatch = input.match(/(\d+)\s*bath/i);
    return bathroomMatch ? parseInt(bathroomMatch[1]) : 2;
  };

  const extractSquareFeet = (input: string): number => {
    const sqftMatch = input.match(/(\d+)\s*sq\s*ft/i) || input.match(/(\d+)\s*sqft/i);
    return sqftMatch ? parseInt(sqftMatch[1]) : 1200;
  };

  // Extract location using Google Places API simulation
  const extractLocationFromGoogleMaps = async (buildingName: string): Promise<{address: string, city: string, township: string}> => {
    setIsLoadingLocation(true);
    
    // Simulate Google Places API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock Google Maps data for known properties
    const locationData: Record<string, {address: string, city: string, township: string}> = {

      "The Peak Residences": {
        address: "Jalan P. Ramlee",
        city: "KLCC",
        township: "Kuala Lumpur City Centre"
      },
      "Mont Kiara Aman": {
        address: "Jalan Kiara 3",
        city: "Mont Kiara",
        township: "Mont Kiara"
      },
      "Elmina Green Serviced Residences": {
        address: "Jalan Elmina Green",
        city: "Shah Alam",
        township: "Elmina"
      }
    };
    
    setIsLoadingLocation(false);
    
    return locationData[buildingName] || {
      address: "Jalan Setiawangsa",
      city: "Kuala Lumpur",
      township: "Setiawangsa"
    };
  };

  const extractCity = (input: string): string => {
    const locationMap = {
      'kota damansara': 'Kota Damansara',
      'damansara': 'Damansara',
      'klcc': 'KLCC',
      'mont kiara': 'Mont Kiara',
      'bangsar': 'Bangsar',
      'kepong': 'Kepong',
      'elmina': 'Elmina',
      'pj': 'Petaling Jaya',
      'petaling jaya': 'Petaling Jaya'
    };
    
    const inputLower = input.toLowerCase();
    
    // Check for specific location matches
    for (const [location, city] of Object.entries(locationMap)) {
      if (inputLower.includes(location)) {
        return city;
      }
    }
    
    return "Kuala Lumpur";
  };

  const generateDescription = (input: string): string => {
    const baseDesc = "Modern and well-designed unit with premium fittings and excellent connectivity.";
    const features = [];
    
    if (input.toLowerCase().includes('pool')) features.push('swimming pool');
    if (input.toLowerCase().includes('gym')) features.push('fitness center');
    if (input.toLowerCase().includes('security')) features.push('24-hour security');
    if (input.toLowerCase().includes('parking')) features.push('covered parking');
    if (input.toLowerCase().includes('furnished')) features.push('fully furnished');
    
    if (features.length > 0) {
      return `${baseDesc} Features include ${features.join(', ')}.`;
    }
    
    return baseDesc;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Airea Agent Portal</h1>
              <Badge className="ml-3 bg-orange-100 text-orange-800">Demo Preview</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Main Site
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">SC</span>
                </div>
                <span className="text-sm font-medium">Sarah Chen</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Listings</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Preview Tab</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Leads</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <stat.icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Listings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentListings.map((listing) => (
                        <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{listing.title}</p>
                            <p className="text-sm text-gray-600">{listing.price}/month</p>
                            <p className="text-xs text-gray-500">{listing.location}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={listing.status === "Active" ? "default" : "secondary"}>
                              {listing.status}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">{listing.views} views • {listing.inquiries} inquiries</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Property
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Check Messages (3 new)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Viewing
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Properties
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
              <div className="flex space-x-3">
                <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Wand2 className="h-4 w-4 mr-2" />
                      AI Quick Create
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>AI Property Listing Generator</DialogTitle>
                      <DialogDescription>
                        Create detailed property listings with AI assistance. Search for buildings or locations, describe your property, and add photos.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="ai-input">Describe your property details</Label>
                        <Textarea
                          id="ai-input"
                          placeholder="Example: Casa Indah 1 for rent RM5000, built up size 1200 sqft, 3 bedrooms, fully furnished with pool and gym facilities"
                          value={aiInput}
                          onChange={(e) => setAiInput(e.target.value)}
                          rows={5}
                          className="mt-2"
                        />
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                          <div className="flex items-start space-x-2">
                            <Wand2 className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-900 mb-1">🎯 AI Smart Parsing</p>
                              <p className="text-blue-700 text-xs leading-relaxed">
                                Include building name, price, size, and features. Our AI will automatically detect location via Google Maps and extract all property details for you.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      


                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">AI will extract:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Location data from Google Maps</li>
                          <li>• Rental price and room details</li>
                          <li>• Size and location information</li>
                          <li>• Amenities and special features</li>
                        </ul>
                        {isLoadingLocation && (
                          <div className="flex items-center mt-2 text-blue-700">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Extracting location from Google Maps...
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => setShowAiModal(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={generateListingWithAI}
                          disabled={isGenerating || !aiInput.trim()}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              AI Processing...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Generate Smart Listing
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Manual Create
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentListings.map((listing) => (
                    <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                        <div>
                          <h3 className="font-medium">{listing.title}</h3>
                          <p className="text-sm text-gray-600">{listing.price}/month</p>
                          <p className="text-xs text-gray-500">{listing.location}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">{listing.views} views</span>
                            <span className="text-xs text-gray-500">{listing.inquiries} inquiries</span>
                            <Badge variant={listing.status === "Active" ? "default" : "secondary"} className="text-xs">
                              {listing.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab - The Key Feature */}
          <TabsContent value="preview" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Preview</h2>
              <p className="text-gray-600 mb-6">See exactly how your properties appear to users on the main site. Make changes and see them instantly.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Property Editor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Property/Building Search - Moved here from AI modal */}
                    <div className="relative">
                      <Label htmlFor="property-search">Search Property/Building Name</Label>
                      <div className="mt-2">
                        <Input
                          id="property-search"
                          placeholder="Type building name or location... (e.g., I-Residence, KLCC, Mont Kiara)"
                          value={propertySearchQuery}
                          onChange={(e) => {
                            setPropertySearchQuery(e.target.value);
                            setShowPropertyDropdown(true);
                          }}
                          onFocus={() => setShowPropertyDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPropertyDropdown(false), 200)}
                          className="w-full"
                        />
                        {showPropertyDropdown && propertySearchQuery.trim() && combinedResults.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {combinedResults.map((item, index) => (
                              <div
                                key={index}
                                onClick={() => handlePropertySelect(item)}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-center">
                                  {item.type === 'property' ? (
                                    <Home className="h-4 w-4 mr-2 text-blue-600" />
                                  ) : (
                                    <MapPin className="h-4 w-4 mr-2 text-green-600" />
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{item.data.name}</div>
                                    {item.data.location && item.data.location !== item.data.name && (
                                      <div className="text-xs text-gray-500">{item.data.street}, {item.data.location}</div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {item.type === 'property' ? 'Building' : 'Location'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedPropertyName && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <div className="text-sm font-medium text-blue-900">{selectedPropertyName.name}</div>
                          <div className="text-xs text-blue-600">{selectedPropertyName.street}, {selectedPropertyName.location}</div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="title">Property Title</Label>
                      <Input 
                        id="title"
                        value={previewProperty.title}
                        onChange={(e) => updatePreviewProperty('title', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="price">Monthly Rent (RM)</Label>
                      <Input 
                        id="price"
                        value={previewProperty.price}
                        onChange={(e) => updatePreviewProperty('price', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Select 
                          value={previewProperty.bedrooms.toString()} 
                          onValueChange={(value) => updatePreviewProperty('bedrooms', Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Select 
                          value={previewProperty.bathrooms.toString()} 
                          onValueChange={(value) => updatePreviewProperty('bathrooms', Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="square-feet">Size (sqft)</Label>
                      <Input 
                        id="square-feet"
                        type="number"
                        value={previewProperty.squareFeet}
                        onChange={(e) => updatePreviewProperty('squareFeet', Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="property-type">Property Type</Label>
                      <Select 
                        value={previewProperty.propertyType} 
                        onValueChange={(value) => updatePreviewProperty('propertyType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="condominium">Condominium</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input 
                        id="address"
                        value={previewProperty.address}
                        onChange={(e) => updatePreviewProperty('address', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City/Area</Label>
                        <Input 
                          id="city"
                          value={previewProperty.city}
                          onChange={(e) => updatePreviewProperty('city', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="postal-code">Postal Code</Label>
                        <Input 
                          id="postal-code"
                          value={previewProperty.postalCode || ''}
                          onChange={(e) => updatePreviewProperty('postalCode', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="land-size-edit">Land Size (sqft)</Label>
                        <Input 
                          id="land-size-edit"
                          type="number"
                          value={landSize}
                          onChange={(e) => setLandSize(e.target.value)}
                          placeholder="e.g., 1200"
                        />
                      </div>
                      <div>
                        <Label htmlFor="title-type-edit">Title Type</Label>
                        <Select value={titleType} onValueChange={setTitleType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select title type" />
                          </SelectTrigger>
                          <SelectContent>
                            {titleTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="amenities">Amenities (comma separated)</Label>
                      <Input 
                        id="amenities"
                        value={previewProperty.amenities?.join(', ') || ''}
                        onChange={(e) => updatePreviewProperty('amenities', e.target.value.split(', ').filter(a => a.trim()))}
                        placeholder="e.g., Swimming Pool, Gym, Security, Parking"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description"
                        value={previewProperty.description || ''}
                        onChange={(e) => updatePreviewProperty('description', e.target.value)}
                        rows={4}
                        placeholder="Detailed property description with highlights, features, and selling points"
                      />
                    </div>

                    {/* Photo Upload Section - Moved from AI Generator */}
                    <div>
                      <Label>Property Photos</Label>
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            id="photo-upload-preview"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Label htmlFor="photo-upload-preview" className="cursor-pointer">
                            <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                              <Upload className="h-4 w-4" />
                              <span>Upload Photos</span>
                            </div>
                          </Label>
                          <span className="text-sm text-gray-500">
                            {selectedImages.length} photo{selectedImages.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                        
                        {/* Preview uploaded images */}
                        {selectedImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {selectedImages.map((image, index) => (
                              <div key={index} className="relative">
                                <img 
                                  src={image} 
                                  alt={`Upload ${index + 1}`}
                                  className="w-full h-16 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button className="flex-1">Save Changes</Button>
                      <Button variant="outline" className="flex-1">Publish Live</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Live Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Live Preview - How Users See It
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                      <PropertyCard 
                        property={{
                          ...previewProperty,
                          agent: {
                            id: "agent-1",
                            name: "Sarah Chen",
                            email: "sarah@properties.com",
                            phone: "+60123456789",
                            company: "Premium Properties",
                            profileImage: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            isVerified: true,
                            specializations: ["Luxury Properties"],
                            bio: null,
                            website: null,
                            experience: null,
                            rating: 4.8,
                            totalReviews: 25
                          }
                        }}
                        onFavoriteToggle={() => {}}
                        isFavorite={false}
                      />
                    </div>
                    
                    {/* Detailed Listing Information */}
                    <div className="mt-6 space-y-4">
                      <h4 className="font-semibold text-gray-900">Complete Listing Details</h4>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Property Type:</span>
                            <span className="font-medium capitalize">{previewProperty.propertyType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Size:</span>
                            <span className="font-medium">{previewProperty.squareFeet} sqft</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bedrooms:</span>
                            <span className="font-medium">{previewProperty.bedrooms}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bathrooms:</span>
                            <span className="font-medium">{previewProperty.bathrooms}</span>
                          </div>
                          {landSize && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Land Size:</span>
                              <span className="font-medium">{landSize} sqft</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly Rent:</span>
                            <span className="font-medium text-blue-600">RM {previewProperty.price}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="font-medium">{previewProperty.city}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Postal Code:</span>
                            <span className="font-medium">{previewProperty.postalCode || 'N/A'}</span>
                          </div>
                          {titleType && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Title Type:</span>
                              <span className="font-medium">{titleTypes.find(t => t.value === titleType)?.label || titleType}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge variant="outline" className="text-green-600">Active</Badge>
                          </div>
                        </div>
                      </div>

                      {previewProperty.amenities && previewProperty.amenities.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Amenities</h5>
                          <div className="flex flex-wrap gap-2">
                            {previewProperty.amenities.map((amenity, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {previewProperty.description && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                          <p className="text-sm text-gray-600 leading-relaxed">{previewProperty.description}</p>
                        </div>
                      )}

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Agent Contact</h5>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Agent:</span>
                            <span className="font-medium">Sarah Chen</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Company:</span>
                            <span className="font-medium">Premium Properties</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">+60123456789</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Rating:</span>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 fill-current text-yellow-400" />
                              <span className="font-medium ml-1">4.8 (25 reviews)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Preview Mode:</strong> This shows exactly how your property appears to users on the main Airea site. 
                        Changes are updated instantly as you edit.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Lead Management</h2>
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Lead Management Dashboard</h3>
                  <p className="text-gray-600">Track inquiries, manage client communications, and convert leads to rentals.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Analytics</h3>
                  <p className="text-gray-600">View detailed insights on property performance, market trends, and optimization suggestions.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}