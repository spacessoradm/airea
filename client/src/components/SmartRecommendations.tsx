import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Search, TrendingUp, MapPin } from "lucide-react";

interface SmartRecommendationsProps {
  originalQuery: string;
  searchType: 'rent' | 'buy';
  onRecommendationClick: (query: string) => void;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  originalQuery,
  searchType,
  onRecommendationClick
}) => {
  
  // Generate smart recommendations based on the original query
  const generateRecommendations = (query: string, type: 'rent' | 'buy') => {
    const lowerQuery = query.toLowerCase();
    const recommendations: string[] = [];

    if (type === 'rent') {
      // If query mentions price, suggest similar price ranges
      if (lowerQuery.includes('rm') || lowerQuery.includes('price') || lowerQuery.includes('budget')) {
        recommendations.push("Budget-friendly apartment under RM2000");
        recommendations.push("Apartment under RM2500 for elderly parents");
        recommendations.push("Modern condominium under RM3500");
      }
      
      // If query mentions location/transport
      if (lowerQuery.includes('mrt') || lowerQuery.includes('lrt') || lowerQuery.includes('near') || lowerQuery.includes('klcc')) {
        recommendations.push("Condo near MRT under RM3000");
        recommendations.push("Condo near KLCC for professionals");
        recommendations.push("Apartment near MRT for daily commute");
      }
      
      // If query mentions property type
      if (lowerQuery.includes('condo') || lowerQuery.includes('apartment') || lowerQuery.includes('studio')) {
        recommendations.push("Premium condominium with facilities");
        recommendations.push("Spacious apartment for growing family");
        recommendations.push("Studio apartment for young professionals");
      }
      
      // If query mentions luxury/premium
      if (lowerQuery.includes('luxury') || lowerQuery.includes('premium') || lowerQuery.includes('high-end')) {
        recommendations.push("Premium condominium with facilities");
        recommendations.push("Luxury condominium with security");
        recommendations.push("Modern condominium under RM3500");
      }
      
      // If no specific recommendations, use popular options
      if (recommendations.length === 0) {
        recommendations.push("Apartment under RM2500 for elderly parents");
        recommendations.push("Premium condominium with facilities");
        recommendations.push("Spacious apartment for growing family");
      }
    } else {
      // Purchase recommendations
      if (lowerQuery.includes('investment') || lowerQuery.includes('rental') || lowerQuery.includes('yield')) {
        recommendations.push("Condominium under RM500k for investment");
        recommendations.push("Serviced residence for rental income");
        recommendations.push("Budget apartment under RM400k");
      }
      
      if (lowerQuery.includes('first') || lowerQuery.includes('starter') || lowerQuery.includes('affordable')) {
        recommendations.push("Modern apartment for first-time buyers");
        recommendations.push("Affordable apartment for young buyers");
        recommendations.push("Budget apartment under RM400k");
      }
      
      if (lowerQuery.includes('luxury') || lowerQuery.includes('premium')) {
        recommendations.push("Premium condominium for purchase");
        recommendations.push("Modern apartment for first-time buyers");
      }
      
      // Default purchase recommendations
      if (recommendations.length === 0) {
        recommendations.push("Modern apartment for first-time buyers");
        recommendations.push("Condominium under RM500k for investment");
        recommendations.push("Affordable apartment for young buyers");
      }
    }

    // Remove duplicates and limit to 4 recommendations
    return Array.from(new Set(recommendations)).slice(0, 4);
  };

  const recommendations = generateRecommendations(originalQuery, searchType);

  return (
    <div className="max-w-4xl mx-auto text-center py-12">
      {/* No Results Message */}
      <div className="mb-8">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          No properties found for "{originalQuery}"
        </h3>
        <p className="text-gray-500">
          Don't worry! Here are some similar searches that have great results
        </p>
      </div>

      {/* Smart Recommendations */}
      <div className="space-y-6">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h4 className="text-lg font-medium text-gray-800">
            Recommended {searchType === 'rent' ? 'Rental' : 'Purchase'} Searches
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((recommendation, index) => (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300"
              onClick={() => onRecommendationClick(recommendation)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800 leading-relaxed">
                        {recommendation}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Click to search this
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alternative Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            Still can't find what you're looking for?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => onRecommendationClick("Premium condominium with facilities")}
              className="flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Browse All Properties</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => onRecommendationClick(searchType === 'rent' ? "Apartment near MRT for daily commute" : "Modern apartment for first-time buyers")}
              className="flex items-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Popular {searchType === 'rent' ? 'Rentals' : 'Sales'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};