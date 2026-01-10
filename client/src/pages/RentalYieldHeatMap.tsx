import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { TrendingUp, MapPin, Calculator, BarChart3, Crown, Building } from "lucide-react";

interface YieldData {
  id: string;
  area: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  averageRentPrice: string;
  averagePropertyPrice: string;
  rentalYield: string;
  propertyCount: number;
  lastUpdated: string;
}

export default function RentalYieldHeatMap() {
  const [selectedState, setSelectedState] = useState<string>("");
  const [minYield, setMinYield] = useState<number>();
  const [maxYield, setMaxYield] = useState<number>();

  // Fetch heat map data
  const { data: heatMapData = [], isLoading } = useQuery<YieldData[]>({
    queryKey: ["/api/rental-yield/heatmap", { state: selectedState, minYield, maxYield }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedState && selectedState !== "all") params.append("state", selectedState);
      if (minYield) params.append("minYield", minYield.toString());
      if (maxYield) params.append("maxYield", maxYield.toString());
      
      const response = await fetch(`/api/rental-yield/heatmap?${params}`);
      if (!response.ok) throw new Error("Failed to fetch yield data");
      return response.json();
    },
  });

  // Fetch top areas
  const { data: topAreas = [] } = useQuery({
    queryKey: ["/api/rental-yield/top-areas", selectedState],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedState && selectedState !== "all") params.append("state", selectedState);
      
      const response = await fetch(`/api/rental-yield/top-areas?${params}`);
      if (!response.ok) throw new Error("Failed to fetch top areas");
      return response.json();
    },
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(parseFloat(amount));
  };

  const getYieldColor = (yieldValue: number) => {
    if (yieldValue >= 6) return "bg-green-500";
    if (yieldValue >= 4) return "bg-yellow-500";
    if (yieldValue >= 2) return "bg-orange-500";
    return "bg-red-500";
  };

  const getYieldBadgeVariant = (yieldValue: number): "default" | "secondary" | "destructive" | "outline" => {
    if (yieldValue >= 6) return "default";
    if (yieldValue >= 4) return "secondary";
    if (yieldValue >= 2) return "outline";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rental Yield Heat Map
          </h1>
          <p className="text-lg text-gray-600">
            Discover the most profitable areas for property investment in Malaysia
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <Select value={selectedState || "all"} onValueChange={(value) => setSelectedState(value === "all" ? "" : value)}>
                  <SelectTrigger data-testid="select-state">
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                    <SelectItem value="Selangor">Selangor</SelectItem>
                    <SelectItem value="Penang">Penang</SelectItem>
                    <SelectItem value="Johor">Johor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Yield (%)
                </label>
                <Select value={minYield?.toString() || "none"} onValueChange={(value) => setMinYield(value === "none" ? undefined : parseInt(value))}>
                  <SelectTrigger data-testid="select-min-yield">
                    <SelectValue placeholder="No minimum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No minimum</SelectItem>
                    <SelectItem value="2">2%</SelectItem>
                    <SelectItem value="3">3%</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Yield (%)
                </label>
                <Select value={maxYield?.toString() || "none"} onValueChange={(value) => setMaxYield(value === "none" ? undefined : parseInt(value))}>
                  <SelectTrigger data-testid="select-max-yield">
                    <SelectValue placeholder="No maximum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No maximum</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  className="w-full"
                  onClick={() => {
                    // Refresh data by invalidating query
                    window.location.reload();
                  }}
                  data-testid="button-refresh"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Performing Areas */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Top Performing Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topAreas.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No data available</p>
                  ) : (
                    topAreas.map((area: any, index: number) => (
                      <div key={area.area} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{area.area}</div>
                            <div className="text-sm text-gray-600">{area.city}, {area.state}</div>
                          </div>
                        </div>
                        <Badge variant={getYieldBadgeVariant(parseFloat(area.rentalYield))}>
                          {parseFloat(area.rentalYield).toFixed(1)}%
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Heat Map Data */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Rental Yield Data
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {heatMapData.length} areas found
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading yield data...</div>
                ) : heatMapData.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600">Try adjusting your filters or check back later.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {heatMapData.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50" data-testid={`yield-item-${item.id}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{item.area}</h3>
                            <div className="flex items-center gap-1 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{item.city}, {item.state}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getYieldColor(parseFloat(item.rentalYield))}`}></div>
                              <span className="text-2xl font-bold text-primary">
                                {parseFloat(item.rentalYield).toFixed(1)}%
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">Annual Yield</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Avg. Rent</div>
                            <div className="font-semibold">{formatCurrency(item.averageRentPrice)}/month</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Avg. Price</div>
                            <div className="font-semibold">{formatCurrency(item.averagePropertyPrice)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Properties</div>
                            <div className="font-semibold">{item.propertyCount}</div>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Yield Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Understanding Rental Yields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                <div className="font-semibold text-green-700">Excellent</div>
                <div className="text-sm text-green-600">6%+ yield</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto mb-2"></div>
                <div className="font-semibold text-yellow-700">Good</div>
                <div className="text-sm text-yellow-600">4-6% yield</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="w-4 h-4 bg-orange-500 rounded-full mx-auto mb-2"></div>
                <div className="font-semibold text-orange-700">Average</div>
                <div className="text-sm text-orange-600">2-4% yield</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2"></div>
                <div className="font-semibold text-red-700">Below Average</div>
                <div className="text-sm text-red-600">Below 2%</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Rental yield is calculated as (Annual Rent ÷ Property Price) × 100. 
              Higher yields indicate better investment returns, but consider other factors like capital appreciation potential and area development.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}