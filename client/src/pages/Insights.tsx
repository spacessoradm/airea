import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { TrendingUp, Sparkles, Award, Users, BarChart3, MapPin, Target, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Insights() {
  const [isPWA, setIsPWA] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = navigator.userAgent.includes('iPad') || navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPod');
      const isAndroid = navigator.userAgent.includes('Android');
      const isMobile = isIOS || isAndroid;
      
      setIsPWA(isStandalone);
    };

    checkPWA();
    window.addEventListener('resize', checkPWA);
    return () => window.removeEventListener('resize', checkPWA);
  }, []);

  return (
    <div className={`min-h-screen bg-gray-50 ${isPWA ? 'pwa-mode' : ''}`}>
      {!isPWA && <Header />}
      
      {/* Hero Section */}
      <div className={`${isPWA ? 'hero-section' : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white py-16'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className={`font-bold mb-4 ${isPWA ? 'hero-title' : 'text-4xl lg:text-5xl'}`}>
              Explore Properties
            </h1>
            <p className={`max-w-2xl mx-auto ${isPWA ? 'hero-description' : 'text-xl text-blue-100'}`}>
              Discover market insights, trends, and the best properties across Malaysia
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Market Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rent</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">RM 2,450</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties Listed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hot Areas</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Mont Kiara</div>
              <p className="text-xs text-muted-foreground">Most searched area</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Days on Market</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">28 days</div>
              <p className="text-xs text-muted-foreground">-5 days from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => window.location.href = '/rental-yield'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Rental Yield Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Discover the best investment opportunities with our interactive rental yield heatmap.
              </p>
              <Button variant="outline" className="w-full">
                View Heatmap
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => window.location.href = '/reviews'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Developer Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Read authentic reviews and ratings for property developers across Malaysia.
              </p>
              <Button variant="outline" className="w-full">
                Read Reviews
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="flex flex-col items-center p-4 h-auto"
              onClick={() => window.location.href = '/'}
            >
              <Sparkles className="h-6 w-6 mb-2 text-blue-600" />
              <span className="text-sm">AI Search</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col items-center p-4 h-auto"
              onClick={() => window.location.href = '/search?q=mont kiara'}
            >
              <MapPin className="h-6 w-6 mb-2 text-green-600" />
              <span className="text-sm">Mont Kiara</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col items-center p-4 h-auto"
              onClick={() => window.location.href = '/search?q=3 bedroom condo'}
            >
              <Target className="h-6 w-6 mb-2 text-purple-600" />
              <span className="text-sm">3BR Condos</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex flex-col items-center p-4 h-auto"
              onClick={() => window.location.href = '/search?q=under rm3000'}
            >
              <TrendingUp className="h-6 w-6 mb-2 text-orange-600" />
              <span className="text-sm">Under RM3k</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation for PWA */}
      {isPWA && (
        <nav className="mobile-nav">
          <a href="/insights" className="mobile-nav-item active">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600">Explore</span>
          </a>
          <a href="/" className="mobile-nav-item">
            <Sparkles className="w-5 h-5" />
            <span>AI Plus</span>
          </a>
          <a href="/rewards" className="mobile-nav-item">
            <Award className="w-5 h-5" />
            <span>Rewards</span>
          </a>
          {isAuthenticated ? (
            <a href="/api/logout" className="mobile-nav-item">
              <Users className="w-5 h-5" />
              <span>Sign Out</span>
            </a>
          ) : (
            <a href="/login" className="mobile-nav-item">
              <Users className="w-5 h-5" />
              <span>Sign In</span>
            </a>
          )}
        </nav>
      )}
    </div>
  );
}