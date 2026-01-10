import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function AgentLogin() {
  const { isAuthenticated, isLoading, user, error } = useAuth();
  const [, setLocation] = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Redirect authenticated agents to dashboard (with loop prevention)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'agent' && !redirectAttempted) {
      console.log('Redirecting agent to dashboard');
      setRedirectAttempted(true);
      setLocation('/comprehensive-agent');
    }
  }, [isAuthenticated, isLoading, user, setLocation, redirectAttempted]);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-center text-red-600">Authentication Error</CardTitle>
            <CardDescription className="text-center">{error.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Retry
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User data not loaded
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Non-agent user (show upgrade message)
  if (isAuthenticated && user && user.role !== 'agent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <Link href="/">
              <Button variant="ghost" className="mb-8 text-blue-600 hover:text-blue-800">
                ← Back to Home
              </Button>
            </Link>
            
            <div className="mb-8">
              <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Agent Access Required
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                You're logged in as <strong>{user.firstName} {user.lastName}</strong> ({user.email}).
                To access the Agent Dashboard, you need agent privileges.
              </p>
            </div>

            <Card className="max-w-2xl mx-auto text-left">
              <CardHeader>
                <CardTitle className="text-center">Become an Airea Agent</CardTitle>
                <CardDescription className="text-center">
                  Join our network of professional real estate agents and unlock powerful business tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Client Management</h3>
                      <p className="text-sm text-gray-600">Manage leads, track inquiries, and build relationships</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Advanced Analytics</h3>
                      <p className="text-sm text-gray-600">Track performance, commissions, and market insights</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Property Listings</h3>
                      <p className="text-sm text-gray-600">Create and manage professional property listings</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Verified Profile</h3>
                      <p className="text-sm text-gray-600">Build trust with verified agent credentials</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Contact our team to upgrade your account to agent status
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Link href="/contact?type=agent-upgrade">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Contact Sales
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline">
                        Back to Search
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Link href="/">
            <Button variant="ghost" className="mb-8 text-blue-600 hover:text-blue-800">
              ← Back to Home
            </Button>
          </Link>
          
          <div className="mb-8">
            <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Agent Dashboard Access
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sign in to access your professional real estate agent dashboard with advanced tools and analytics.
            </p>
          </div>

          <Card className="max-w-2xl mx-auto text-left">
            <CardHeader>
              <CardTitle className="text-center">Airea Agent Portal</CardTitle>
              <CardDescription className="text-center">
                Professional tools for Malaysian real estate agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Lead Management</h3>
                    <p className="text-sm text-gray-600">Track inquiries and convert prospects</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Performance Analytics</h3>
                    <p className="text-sm text-gray-600">Monitor sales and commission tracking</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Property Management</h3>
                    <p className="text-sm text-gray-600">Create and manage listings efficiently</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Verified Status</h3>
                    <p className="text-sm text-gray-600">Build trust with verified credentials</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Link href="/login?redirect=/comprehensive-agent">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                    aria-label="Sign in to access the agent dashboard"
                  >
                    Sign In to Agent Dashboard
                  </Button>
                </Link>
                <p className="text-sm text-gray-500 text-center mt-4">
                  Secure authentication • Protected access
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}