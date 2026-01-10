import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import swipeCardsImage from "@assets/stock_images/mobile_app_swipe_car_c2e20e0a.jpg";
import mapBottomSheetImage from "@assets/stock_images/mobile_app_map_with__22666e85.jpg";
import storiesFeedImage from "@assets/stock_images/instagram_stories_ve_011e1963.jpg";
import dashboardImage from "@assets/stock_images/mobile_app_dashboard_797d26af.jpg";

interface DesignOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  image: string;
  bestFor: string;
}

const designOptions: DesignOption[] = [
  {
    id: "card-stack",
    title: "Card Stack Hub",
    subtitle: "Tinder-Style Browsing",
    description: "Swipeable property cards with gesture-based navigation. Full-screen cards you swipe through like stories.",
    features: [
      "Swipe right to favorite, left to skip",
      "Bottom tab navigation",
      "Floating action button for AI search",
      "Quick actions: Save, Share, Contact",
      "Haptic feedback and smooth animations"
    ],
    image: swipeCardsImage,
    bestFor: "Visual browsing, quick decision-making, fun engagement"
  },
  {
    id: "map-explorer",
    title: "Split Panel Map Explorer",
    subtitle: "Map-First Discovery",
    description: "Full-screen map with draggable bottom sheet showing property listings. See where properties are located while browsing.",
    features: [
      "Interactive map with property pins",
      "Swipeable bottom sheet (3 states)",
      "Drag up for list, down for map focus",
      "Quick filter chips at top",
      "Location-based discovery"
    ],
    image: mapBottomSheetImage,
    bestFor: "Location-focused search, neighborhood exploration, map lovers"
  },
  {
    id: "story-feed",
    title: "Immersive Story Feed",
    subtitle: "Instagram/TikTok Style",
    description: "Full-screen vertical scrolling with story-style property cards. Swipe up for next property, down to go back.",
    features: [
      "Full-bleed property images",
      "Vertical swipe navigation",
      "Horizontal swipe for more photos",
      "Quick save/contact overlay buttons",
      "Auto-advance option"
    ],
    image: storiesFeedImage,
    bestFor: "Visual-first browsing, mobile-native feel, younger audience"
  },
  {
    id: "modular-dashboard",
    title: "Modular Dashboard",
    subtitle: "Widget-Based Hub",
    description: "Home screen with widget cards showing recent searches, recommendations, and trending properties. Information-dense with glanceable content.",
    features: [
      "Widget cards (Recent, Trending, Saved)",
      "AI assistant chat bubble",
      "Quick filter pills",
      "Expandable property tiles",
      "Pull-to-refresh"
    ],
    image: dashboardImage,
    bestFor: "Power users, data-heavy browsing, returning customers"
  }
];

export default function DesignShowcase() {
  const [, setLocation] = useLocation();
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/simple')}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Choose Your App Style</h1>
              <p className="text-sm text-gray-500">Select a design that fits your vision</p>
            </div>
          </div>
        </div>
      </div>

      {/* Design Options */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {designOptions.map((option) => (
            <Card 
              key={option.id}
              className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                selectedDesign === option.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedDesign(option.id)}
            >
              {/* Image Preview */}
              <div className="aspect-[9/16] max-h-96 bg-gray-100 overflow-hidden">
                <img 
                  src={option.image} 
                  alt={option.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{option.title}</h3>
                    <p className="text-sm text-blue-600">{option.subtitle}</p>
                  </div>
                  {selectedDesign === option.id && (
                    <div className="bg-blue-500 text-white rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm">{option.description}</p>

                {/* Best For */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-1">BEST FOR:</p>
                  <p className="text-sm text-blue-700">{option.bestFor}</p>
                </div>

                {/* Features */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">KEY FEATURES:</p>
                  <ul className="space-y-1">
                    {option.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Select Button */}
                <Button 
                  className="w-full"
                  variant={selectedDesign === option.id ? "default" : "outline"}
                >
                  {selectedDesign === option.id ? 'Selected' : 'Select This Design'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Action */}
        {selectedDesign && (
          <div className="mt-8 bg-white rounded-lg border p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to implement?</h3>
            <p className="text-gray-600 mb-4">
              I can build the <span className="font-semibold text-blue-600">
                {designOptions.find(d => d.id === selectedDesign)?.title}
              </span> interface for your app.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setSelectedDesign(null)}>
                Change Selection
              </Button>
              <Button onClick={() => setLocation('/simple')}>
                Let's Build It
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
