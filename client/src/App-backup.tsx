import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import { useAuth } from "@/hooks/useAuth";
import { Component, ReactNode, useState, useEffect, lazy, Suspense } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import SearchResults from "@/pages/SearchResults";
import SplashScreen from "@/components/SplashScreen";

// Lazy load heavy components

const PropertyDetail = lazy(() => import("@/pages/PropertyDetail"));
const EnhancedAgentDashboard = lazy(() => import("@/pages/EnhancedAgentDashboard"));
const ComprehensiveAgentDashboard = lazy(() => import("@/pages/ComprehensiveAgentDashboard"));
const Rewards = lazy(() => import("@/pages/Rewards"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const DeveloperReviews = lazy(() => import("@/pages/DeveloperReviews"));
const RentalYieldHeatMap = lazy(() => import("@/pages/RentalYieldHeatMap"));
const MortgageTools = lazy(() => import("@/pages/MortgageTools"));
const AgentPortalDemo = lazy(() => import("@/pages/AgentPortalDemo"));
const LocationDemo = lazy(() => import("@/pages/LocationDemo"));
const AIRecommendationsPage = lazy(() => import("@/pages/AIRecommendationsPage"));
const AgentLogin = lazy(() => import("@/pages/AgentLogin"));
const Insights = lazy(() => import("@/pages/Insights"));

// Loading spinner component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center p-6 max-w-lg">
            <h1 className="text-xl font-bold text-red-600 mb-4">App Error</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/search" component={SearchResults} />
        <Route path="/property/:id" component={PropertyDetail} />
        <Route path="/reviews" component={DeveloperReviews} />
        <Route path="/rental-yield" component={RentalYieldHeatMap} />
        <Route path="/mortgage" component={MortgageTools} />
        <Route path="/agent-portal-demo" component={AgentPortalDemo} />
        <Route path="/enhanced-agent" component={EnhancedAgentDashboard} />
        <Route path="/comprehensive-agent" component={ComprehensiveAgentDashboard} />
        <Route path="/location-demo" component={LocationDemo} />
        <Route path="/recommendations" component={AIRecommendationsPage} />
        <Route path="/rewards" component={Rewards} />
        <Route path="/insights" component={Insights} />
        <Route path="/agent/login" component={AgentLogin} />
        <Route path="/agent/dashboard" component={ComprehensiveAgentDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [appReady, setAppReady] = useState(false);
  const [isPWA] = useState(() => {
    // INSTANT PWA detection
    return window.matchMedia('(display-mode: standalone)').matches ||
           document.referrer.includes('android-app://');
  });

  useEffect(() => {
    if (isPWA) {
      // Start preloading immediately while showing splash
      const preloadData = async () => {
        try {
          await fetch('/api/properties?limit=6');
          // Wait a bit more to ensure home page is fully ready
          setTimeout(() => {
            // Remove splash only when everything is loaded
            document.body.classList.remove('splash-active');
            document.body.style.background = '';
            document.body.style.overflow = '';
            setAppReady(true);
          }, 800); // Extended time to ensure home page is ready
        } catch (error) {
          // Even if preload fails, show the app
          setTimeout(() => {
            document.body.classList.remove('splash-active');
            document.body.style.background = '';
            document.body.style.overflow = '';
            setAppReady(true);
          }, 1000);
        }
      };
      preloadData();
    } else {
      // For browser: Load immediately
      setAppReady(true);
    }
  }, [isPWA]);

  // For PWA: CSS splash handles everything - no React splash needed
  if (isPWA && !appReady) {
    return <div className="min-h-screen bg-transparent"></div>;
  }
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <div className={isPWA ? "pwa-mode" : ""}>
            <Toaster />
            <Router />
            {!isPWA && <PWAInstallPrompt />}
          </div>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
