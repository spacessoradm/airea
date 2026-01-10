import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense, useEffect } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "@/pages/Landing";
import SearchResults from "@/pages/SearchResults";
import NotFound from "@/pages/not-found";

// Eagerly load all core PWA pages to prevent blue screens
import Rewards from "@/pages/Rewards";
import Insights from "@/pages/Insights";
import { PWASplashFix } from "@/components/PWASplashFix";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Lazy load only non-essential pages with optimized loading
const PropertyDetail = lazy(() => import("@/pages/PropertyDetail"));
const PropertyGallery = lazy(() => import("@/pages/PropertyGallery"));
const DeveloperReviews = lazy(() => import("@/pages/DeveloperReviews"));
const RentalYieldHeatMap = lazy(() => import("@/pages/RentalYieldHeatMap"));
const MortgageTools = lazy(() => import("@/pages/MortgageTools"));
const MortgageCalculatorPage = lazy(() => import("@/pages/MortgageCalculatorPage"));
const LoanEligibilityPage = lazy(() => import("@/pages/LoanEligibilityPage"));
const AgentPortalDemo = lazy(() => import("@/pages/AgentPortalDemo"));
const LocationDemo = lazy(() => import("@/pages/LocationDemo"));
const AIRecommendationsPage = lazy(() => import("@/pages/AIRecommendationsPage"));
const EnhancedAgentDashboard = lazy(() => import("@/pages/EnhancedAgentDashboard"));
const ComprehensiveAgentDashboard = lazy(() => import("@/pages/ComprehensiveAgentDashboard"));
const AgentLogin = lazy(() => import("@/pages/AgentLogin"));
const AgentPortal = lazy(() => import("@/pages/AgentPortal"));
const CreateListing = lazy(() => import("@/pages/CreateListing"));
const CreateListingSimple = lazy(() => import("@/pages/CreateListingSimple"));
const CreateListingFixed = lazy(() => import("@/pages/CreateListingFixed"));
const CreateListingBasic = lazy(() => import("@/pages/CreateListingBasic"));
const CreateListingFlow = lazy(() => import("@/pages/CreateListingFlow"));
const EditPropertyFlow = lazy(() => import("@/pages/EditPropertyFlow"));
const LocationSearchDemo = lazy(() => import("@/pages/LocationSearchDemo"));
const TransportStationPage = lazy(() => import("@/pages/TransportStationPage"));
const TransportProximitySearchPage = lazy(() => import("@/pages/TransportProximitySearchPage"));
const SmartTooltipDemo = lazy(() => import("@/pages/SmartTooltipDemo"));
const PropertySearchResultsDemo = lazy(() => import("@/pages/PropertySearchResultsDemo"));
import AgentDashboard from "@/pages/AgentDashboard";

// Simplified version pages - eagerly loaded for PWA performance
import SimpleLanding from "@/pages/SimpleLanding";
import SimpleSearch from "@/pages/SimpleSearch";
const SimpleSearchResults = lazy(() => import("@/pages/SimpleSearchResults"));
const SimplePropertyDetail = lazy(() => import("@/pages/SimplePropertyDetail"));
const SimpleSaved = lazy(() => import("@/pages/SimpleSaved"));
const SimpleProfile = lazy(() => import("@/pages/SimpleProfile"));
const SimpleAccountSettings = lazy(() => import("@/pages/SimpleAccountSettings"));
const SimpleArticle = lazy(() => import("@/pages/SimpleArticle"));
const SimpleAgentDashboard = lazy(() => import("@/pages/SimpleAgentDashboard"));
const DesignShowcase = lazy(() => import("@/pages/DesignShowcase"));

// User pages
const Profile = lazy(() => import("@/pages/Profile"));
const AccountSettings = lazy(() => import("@/pages/AccountSettings"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const Messages = lazy(() => import("@/pages/Messages"));

// Legal and info pages
const ContactUs = lazy(() => import("@/pages/ContactUs"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("@/pages/TermsAndConditions"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const EmailLogin = lazy(() => import("@/pages/EmailLogin"));
const UnifiedAgentProfile = lazy(() => import("@/pages/UnifiedAgentProfile"));

// Ultra-fast minimal loader
function PageLoader() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-400 text-xs">•••</div>
    </div>
  );
}

// Import AIChat directly (no lazy loading for critical UI)
import AIChat from "@/components/AIChat";

// PWA redirect component - ensures iOS/Android PWAs always open to /simple
function PWARedirect() {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Detect if app is running as PWA (standalone mode)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    
    // If it's a PWA and user is on root path, redirect to /simple
    if (isPWA && location === '/') {
      console.log('PWA detected - redirecting to /simple interface');
      setLocation('/simple');
    }
  }, [location, setLocation]);
  
  return null;
}

const App: React.FC = () => {

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ChatProvider>
          <LanguageProvider>
            <ErrorBoundary>
              <PWASplashFix>
                  <div className="min-h-screen bg-white">
                <PWARedirect />
                <Suspense fallback={<PageLoader />}>
                  <Switch>
                    {/* Simplified version routes */}
                    <Route path="/simple" component={SimpleLanding} />
                    <Route path="/simple/search" component={SimpleSearch} />
                    <Route path="/simple/search-results" component={SimpleSearchResults} />
                    <Route path="/simple/property/:id" component={SimplePropertyDetail} />
                    <Route path="/simple/article/:id" component={SimpleArticle} />
                    <Route path="/simple/saved" component={SimpleSaved} />
                    <Route path="/simple/profile" component={SimpleProfile} />
                    <Route path="/simple/account-settings" component={SimpleAccountSettings} />
                    <Route path="/simple/agent/listings" component={SimpleAgentDashboard} />
                    <Route path="/simple/agent/create" component={CreateListingFlow} />
                    <Route path="/simple/agent/edit/:id" component={EditPropertyFlow} />
                    <Route path="/simple/agent/inquiries" component={SimpleAgentDashboard} />
                    <Route path="/simple/agent/profile" component={SimpleAgentDashboard} />
                    <Route path="/simple/agent" component={SimpleAgentDashboard} />
                    <Route path="/design-showcase" component={DesignShowcase} />
                    
                    {/* Original full-featured routes */}
                    <Route path="/" component={Landing} />
                    <Route path="/search" component={SearchResults} />
                    <Route path="/rewards" component={Rewards} />
                    <Route path="/insights" component={Insights} />
                    <Route path="/property/:id" component={PropertyDetail} />
                    <Route path="/property/:id/gallery" component={PropertyGallery} />
                    <Route path="/profile" component={Profile} />
                    <Route path="/account-settings" component={AccountSettings} />
                    <Route path="/favorites" component={Favorites} />
                    <Route path="/messages" component={Messages} />
                    <Route path="/reviews" component={DeveloperReviews} />
                    <Route path="/rental-yield" component={RentalYieldHeatMap} />
                    <Route path="/mortgage" component={MortgageTools} />
                    <Route path="/mortgage-calculator" component={MortgageCalculatorPage} />
                    <Route path="/loan-eligibility" component={LoanEligibilityPage} />
                    <Route path="/agent-portal-demo" component={AgentPortalDemo} />
                    <Route path="/enhanced-agent" component={EnhancedAgentDashboard} />
                    <Route path="/comprehensive-agent" component={ComprehensiveAgentDashboard} />
                    <Route path="/location-demo" component={LocationDemo} />
                    <Route path="/location-search-demo" component={LocationSearchDemo} />
                    <Route path="/transport" component={TransportStationPage} />
                    <Route path="/transport-search" component={TransportProximitySearchPage} />
                    <Route path="/smart-tooltips" component={SmartTooltipDemo} />
                    <Route path="/property-search-demo" component={PropertySearchResultsDemo} />
                    <Route path="/recommendations" component={AIRecommendationsPage} />
                    <Route path="/agent/login" component={AgentLogin} />
                    <Route path="/login" component={EmailLogin} />
                    <Route path="/agent/portal" component={AgentPortal} />
                    <Route path="/agent/dashboard" component={ComprehensiveAgentDashboard} />
                    <Route path="/agent/profile" component={UnifiedAgentProfile} />
                    <Route path="/agents/:id" component={UnifiedAgentProfile} />
                    <Route path="/agent/create-listing" component={CreateListingFlow} />
                    <Route path="/agent/properties/edit/:id" component={EditPropertyFlow} />
                    <Route path="/agent/create-listing-full" component={CreateListing} />
                    
                    {/* Legal and info pages */}
                    <Route path="/contact" component={ContactUs} />
                    <Route path="/privacy-policy" component={PrivacyPolicy} />
                    <Route path="/terms" component={TermsAndConditions} />
                    
                    {/* Admin pages */}
                    <Route path="/admin/dashboard" component={AdminDashboard} />
                    
                    <Route component={NotFound} />
                  </Switch>
                </Suspense>
                  <Toaster />
                  
                  {/* PWA Install Prompt - Shows on supported devices */}
                  <PWAInstallPrompt />
                  
                  {/* Global AI Chat Assistant - Hidden for MVP, will be enabled in next phase */}
                  {/* <AIChat /> */}
                  </div>
                </PWASplashFix>
              </ErrorBoundary>
            </LanguageProvider>
          </ChatProvider>
        </QueryClientProvider>
      </ErrorBoundary>
  );
};

export default App;