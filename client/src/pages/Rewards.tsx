import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { GamificationDashboard } from "@/components/GamificationDashboard";
import { TrendingUp, Sparkles, Award, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Rewards() {
  const [isPWA, setIsPWA] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

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

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${isPWA ? 'pwa-mode' : ''} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen bg-gray-50 ${isPWA ? 'pwa-mode' : ''} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to sign in...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isPWA ? 'pwa-mode' : ''}`}>
      {!isPWA && <Header />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Explorer Rewards</h1>
          <p className="text-lg text-gray-600">
            Complete challenges while exploring properties to earn points and unlock achievements
          </p>
        </div>
        
        <GamificationDashboard />
      </div>

      {/* Mobile Navigation for PWA */}
      {isPWA && (
        <nav className="mobile-nav">
          <a href="/insights" className="mobile-nav-item">
            <TrendingUp className="w-5 h-5" />
            <span>Explore</span>
          </a>
          <a href="/" className="mobile-nav-item">
            <Sparkles className="w-5 h-5" />
            <span>AI Plus</span>
          </a>
          <a href="/rewards" className="mobile-nav-item active">
            <Award className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600">Rewards</span>
          </a>
          <a href="/api/logout" className="mobile-nav-item">
            <Users className="w-5 h-5" />
            <span>Sign Out</span>
          </a>
        </nav>
      )}
    </div>
  );
}