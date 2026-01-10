import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Loader2 } from "lucide-react";

interface AISearchBarProps {
  onSearch: (query: string, filters: any, results: any[]) => void;
}

const suggestionQueries = [
  "Condos in Mont Kiara under RM2500",
  "3-bedroom house near LRT station",
  "Studio apartment in Bangsar with gym",
  "Units for rent near KLCC within 10 mins driving below RM3000",
  "2BR apartment in Petaling Jaya with parking",
  "House in Shah Alam with garden under RM2000"
];

export default function AISearchBar({ onSearch }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const aiSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Failed to process AI search');
      }

      return response.json();
    },
    onSuccess: (result) => {
      onSearch(result.query, result.filters, result.properties);
      toast({
        title: "AI Search Complete",
        description: `Found ${result.count} properties matching your criteria`,
      });
    },
    onError: (error) => {
      toast({
        title: "Search Error",
        description: "Failed to process your search. Please try again.",
        variant: "destructive",
      });
      console.error("AI search error:", error);
    },
  });

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    aiSearchMutation.mutate(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    aiSearchMutation.mutate(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className="bg-white py-8 border-b">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Find Your Perfect Property
          </h2>
          <p className="text-lg text-gray-600">
            Describe what you're looking for in plain English
          </p>
        </div>
        
        <div className="relative">
          <Card className="search-shadow border-2 border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder='Ask me anything — e.g. "condo near MRT below RM2500"'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg border-0 focus:ring-0 focus:outline-none placeholder-gray-400 pr-12"
                    disabled={aiSearchMutation.isPending}
                  />
                  {aiSearchMutation.isPending && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <Button 
                  size="lg"
                  onClick={handleSearch}
                  disabled={aiSearchMutation.isPending}
                  className="px-8"
                >
                  {aiSearchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
              
              {/* AI Search Suggestions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="flex items-center text-sm text-gray-500 mr-2">
                  <Sparkles className="mr-1 h-4 w-4" />
                  Try:
                </div>
                {suggestionQueries.slice(0, 3).map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={aiSearchMutation.isPending}
                    className="text-sm bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 transition-colors"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
              
              {/* Advanced Search Toggle */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    Powered by AI for natural language understanding
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Malaysian Properties
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Example queries help */}
        <div className="mt-6 text-center">
          <details className="group">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-primary transition-colors">
              See more search examples
            </summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {suggestionQueries.slice(3).map((suggestion, index) => (
                <Button
                  key={index + 3}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={aiSearchMutation.isPending}
                  className="text-gray-600 hover:text-primary hover:bg-primary/5 justify-start"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
